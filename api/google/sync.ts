import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getServiceClient, getUserFromRequest } from '../_lib/supabaseAdmin'
import { refreshAccessToken, listGoogleEvents, createGoogleEvent, updateGoogleEvent, parseGoogleEventDateTime, type GoogleEvent } from '../_lib/google'

const WINDOW_PAST_DAYS = 30
const WINDOW_FUTURE_DAYS = 180

function isoDaysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

function todayIsoRange() {
  return { start: isoDaysFromNow(-WINDOW_PAST_DAYS), end: isoDaysFromNow(WINDOW_FUTURE_DAYS) }
}

interface LocalEvent {
  id: string
  title: string
  event_date: string
  event_time: string | null
  notes: string | null
  google_event_id: string | null
  updated_at: string
}

/** Sincroniza a Agenda do app com o Google Agenda nos dois sentidos:
 * - compromissos novos no app (sem google_event_id) são criados no Google
 * - compromissos já linkados são atualizados no Google com os dados atuais
 *   do app, A NÃO SER que o Google tenha uma versão mais recente — nesse
 *   caso o app é atualizado a partir do Google
 * - eventos novos no Google (sem vínculo local) viram compromissos novos
 *   no app
 * Não sincroniza exclusões (apagar de um lado não apaga do outro ainda). */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })

  try {
    const user = await getUserFromRequest(req)
    if (!user) return res.status(401).json({ error: 'Não autenticado' })

    const admin = getServiceClient()

    const { data: conn } = await admin.from('google_calendar_connections').select('*').eq('user_id', user.id).maybeSingle()
    if (!conn) return res.status(400).json({ error: 'Conta Google não conectada' })

    let accessToken = conn.access_token as string | null
    const expiresAt = conn.access_token_expires_at ? new Date(conn.access_token_expires_at).getTime() : 0
    if (!accessToken || expiresAt < Date.now() + 60_000) {
      const refreshed = await refreshAccessToken(conn.refresh_token)
      accessToken = refreshed.access_token
      await admin
        .from('google_calendar_connections')
        .update({ access_token: accessToken, access_token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString() })
        .eq('user_id', user.id)
    }

    const { start, end } = todayIsoRange()
    const calendarId = conn.calendar_id as string

    const [localRes, googleEvents] = await Promise.all([
      admin
        .from('agenda_events')
        .select('id, title, event_date, event_time, notes, google_event_id, updated_at')
        .eq('user_id', user.id)
        .gte('event_date', start.slice(0, 10))
        .lte('event_date', end.slice(0, 10)),
      listGoogleEvents(accessToken!, calendarId, start, end),
    ])

    const localEvents = (localRes.data ?? []) as LocalEvent[]
    const localByGoogleId = new Map(localEvents.filter((e) => e.google_event_id).map((e) => [e.google_event_id as string, e]))
    const googleById = new Map(googleEvents.map((e) => [e.id, e]))

    let pulled = 0
    let pushed = 0
    let updatedFromGoogle = 0
    const matchedGoogleIds = new Set<string>()
    const pulledFromGoogleIds = new Set<string>()
    const lastSync = conn.last_synced_at ? new Date(conn.last_synced_at).getTime() : 0

    // 1) eventos do Google que já têm vínculo local: se o Google tem uma
    // versão mais nova que a última sincronização, atualiza o app
    for (const [googleId, local] of localByGoogleId) {
      const g = googleById.get(googleId)
      if (!g) continue
      matchedGoogleIds.add(googleId)
      const googleUpdated = g.updated ? new Date(g.updated).getTime() : 0
      if (googleUpdated > lastSync) {
        const { date, time } = parseGoogleEventDateTime(g)
        await admin
          .from('agenda_events')
          .update({ title: g.summary || local.title, event_date: date, event_time: time, notes: g.description ?? null, updated_at: new Date().toISOString() })
          .eq('id', local.id)
        updatedFromGoogle++
        pulledFromGoogleIds.add(googleId)
      }
    }

    // 2) eventos novos no Google (sem vínculo local) → cria localmente
    for (const g of googleEvents) {
      if (matchedGoogleIds.has(g.id)) continue
      const { date, time } = parseGoogleEventDateTime(g)
      await admin.from('agenda_events').insert({
        user_id: user.id,
        title: g.summary || 'Sem título',
        event_date: date,
        event_time: time,
        notes: g.description ?? null,
        google_event_id: g.id,
        done: false,
      })
      pulled++
    }

    // 3) compromissos locais sem vínculo → cria no Google
    for (const local of localEvents) {
      if (local.google_event_id) continue
      const created: GoogleEvent = await createGoogleEvent(accessToken!, calendarId, {
        title: local.title,
        date: local.event_date,
        time: local.event_time,
        notes: local.notes,
      })
      await admin.from('agenda_events').update({ google_event_id: created.id }).eq('id', local.id)
      pushed++
    }

    // 4) compromissos locais já vinculados que o Google NÃO tinha uma
    // versão mais nova (ou seja, não foram sobrescritos no passo 1) —
    // manda a versão local pro Google
    for (const local of localEvents) {
      if (!local.google_event_id || pulledFromGoogleIds.has(local.google_event_id)) continue
      if (!googleById.has(local.google_event_id)) continue
      await updateGoogleEvent(accessToken!, calendarId, local.google_event_id, {
        title: local.title,
        date: local.event_date,
        time: local.event_time,
        notes: local.notes,
      })
      pushed++
    }

    await admin.from('google_calendar_connections').update({ last_synced_at: new Date().toISOString() }).eq('user_id', user.id)

    return res.status(200).json({ pushed, pulled, updatedFromGoogle })
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Erro desconhecido' })
  }
}
