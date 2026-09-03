import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type User } from '@supabase/supabase-js'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const CALENDAR_TIMEZONE = 'America/Sao_Paulo'
const WINDOW_PAST_DAYS = 30
const WINDOW_FUTURE_DAYS = 180

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope: string
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const params = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: process.env.VITE_GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    grant_type: 'refresh_token',
  })
  const res = await fetch(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params })
  if (!res.ok) throw new Error(`Falha ao renovar token do Google: ${await res.text()}`)
  return (await res.json()) as TokenResponse
}

interface GoogleEvent {
  id: string
  summary?: string
  description?: string
  status?: string
  updated?: string
  start?: { date?: string; dateTime?: string }
  end?: { date?: string; dateTime?: string }
  eventType?: string
}

async function googleFetch<T>(accessToken: string, path: string, init?: RequestInit): Promise<T | null> {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`Google Calendar API (${path}): ${res.status} ${await res.text()}`)
  return res.status === 204 ? null : ((await res.json()) as T)
}

async function listGoogleEvents(accessToken: string, calendarId: string, timeMinIso: string, timeMaxIso: string): Promise<GoogleEvent[]> {
  const params = new URLSearchParams({ timeMin: timeMinIso, timeMax: timeMaxIso, singleEvents: 'true', maxResults: '250' })
  const data = await googleFetch<{ items?: GoogleEvent[] }>(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events?${params}`)
  return (data?.items ?? []).filter((e) => e.status !== 'cancelled')
}

function toGoogleTime(date: string, time: string | null) {
  if (!time) return { date }
  return { dateTime: `${date}T${time.slice(0, 5)}:00`, timeZone: CALENDAR_TIMEZONE }
}

function addOneHour(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const total = (h + 1) % 24
  return `${String(total).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function nextDay(dateIso: string): string {
  const [y, m, d] = dateIso.split('-').map(Number)
  const next = new Date(y, m - 1, d + 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
}

async function createGoogleEvent(accessToken: string, calendarId: string, event: { title: string; date: string; time: string | null; notes: string | null }): Promise<GoogleEvent> {
  const start = toGoogleTime(event.date, event.time)
  const endTime = event.time ? addOneHour(event.time) : null
  const end = event.time ? { dateTime: `${event.date}T${endTime}:00`, timeZone: CALENDAR_TIMEZONE } : { date: nextDay(event.date) }
  const created = await googleFetch<GoogleEvent>(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    body: JSON.stringify({ summary: event.title, description: event.notes ?? undefined, start, end }),
  })
  return created!
}

async function updateGoogleEvent(
  accessToken: string,
  calendarId: string,
  googleEventId: string,
  event: { title: string; date: string; time: string | null; notes: string | null },
): Promise<GoogleEvent> {
  const start = toGoogleTime(event.date, event.time)
  const endTime = event.time ? addOneHour(event.time) : null
  const end = event.time ? { dateTime: `${event.date}T${endTime}:00`, timeZone: CALENDAR_TIMEZONE } : { date: nextDay(event.date) }
  const updated = await googleFetch<GoogleEvent>(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ summary: event.title, description: event.notes ?? undefined, start, end }),
  })
  return updated!
}

function parseGoogleEventDateTime(ev: GoogleEvent): { date: string; time: string | null } {
  if (ev.start?.date) return { date: ev.start.date, time: null }
  const dt = new Date(ev.start!.dateTime!)
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: CALENDAR_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = Object.fromEntries(fmt.formatToParts(dt).map((p) => [p.type, p.value]))
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` }
}

async function getUserFromRequest(req: VercelRequest): Promise<User | null> {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return null

  const url = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null

  const client = createClient(url, anonKey, { auth: { persistSession: false } })
  const { data, error } = await client.auth.getUser(auth.slice('Bearer '.length))
  if (error || !data.user) return null
  return data.user
}

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
 * Não sincroniza exclusões (apagar de um lado não apaga do outro ainda).
 *
 * Tudo embutido neste arquivo (sem importar de api/_lib) porque importar
 * de outros arquivos dentro de /api estava derrubando a função na Vercel
 * (FUNCTION_INVOCATION_FAILED) — só imports de pacotes do node_modules
 * funcionam nesse ambiente. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })

  try {
    const user = await getUserFromRequest(req)
    if (!user) return res.status(401).json({ error: 'Não autenticado' })

    const serviceUrl = process.env.VITE_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceUrl || !serviceKey) {
      return res.status(500).json({ error: 'Variáveis de ambiente do Supabase (service role) não configuradas na Vercel.' })
    }
    const admin = createClient(serviceUrl, serviceKey, { auth: { persistSession: false } })

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
    // erros de eventos individuais não abortam a sincronização inteira —
    // cada evento é isolado, então um problema num compromisso não trava
    // os outros. Os erros coletados aqui voltam pro app pra mostrar ao
    // usuário qual compromisso específico não sincronizou.
    const errors: string[] = []

    // 1) eventos do Google que já têm vínculo local: se o Google tem uma
    // versão mais nova que a última sincronização, atualiza o app
    for (const [googleId, local] of localByGoogleId) {
      const g = googleById.get(googleId)
      if (!g) continue
      matchedGoogleIds.add(googleId)
      const googleUpdated = g.updated ? new Date(g.updated).getTime() : 0
      if (googleUpdated > lastSync) {
        try {
          const { date, time } = parseGoogleEventDateTime(g)
          await admin
            .from('agenda_events')
            .update({ title: g.summary || local.title, event_date: date, event_time: time, notes: g.description ?? null, updated_at: new Date().toISOString() })
            .eq('id', local.id)
          updatedFromGoogle++
          pulledFromGoogleIds.add(googleId)
        } catch (err) {
          errors.push(`"${local.title}": ${err instanceof Error ? err.message : 'erro desconhecido'}`)
        }
      }
    }

    // 2) eventos novos no Google (sem vínculo local) → cria localmente
    for (const g of googleEvents) {
      if (matchedGoogleIds.has(g.id)) continue
      try {
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
      } catch (err) {
        errors.push(`"${g.summary ?? 'Sem título'}" (do Google): ${err instanceof Error ? err.message : 'erro desconhecido'}`)
      }
    }

    // 3) compromissos locais sem vínculo → cria no Google
    for (const local of localEvents) {
      if (local.google_event_id) continue
      try {
        const created: GoogleEvent = await createGoogleEvent(accessToken!, calendarId, {
          title: local.title,
          date: local.event_date,
          time: local.event_time,
          notes: local.notes,
        })
        await admin.from('agenda_events').update({ google_event_id: created.id }).eq('id', local.id)
        pushed++
      } catch (err) {
        errors.push(`"${local.title}": ${err instanceof Error ? err.message : 'erro desconhecido'}`)
      }
    }

    // 4) compromissos locais já vinculados que o Google NÃO tinha uma
    // versão mais nova (ou seja, não foram sobrescritos no passo 1) —
    // manda a versão local pro Google
    for (const local of localEvents) {
      if (!local.google_event_id || pulledFromGoogleIds.has(local.google_event_id)) continue
      const googleEvent = googleById.get(local.google_event_id)
      if (!googleEvent) continue
      // eventos especiais (aniversário, fora do escritório, etc.) são
      // gerados automaticamente pelo Google e não podem ser editados via
      // API do jeito normal — só sincroniza eventos "default"
      if (googleEvent.eventType && googleEvent.eventType !== 'default') continue
      try {
        await updateGoogleEvent(accessToken!, calendarId, local.google_event_id, {
          title: local.title,
          date: local.event_date,
          time: local.event_time,
          notes: local.notes,
        })
        pushed++
      } catch (err) {
        errors.push(`"${local.title}": ${err instanceof Error ? err.message : 'erro desconhecido'}`)
      }
    }

    await admin.from('google_calendar_connections').update({ last_synced_at: new Date().toISOString() }).eq('user_id', user.id)

    return res.status(200).json({ pushed, pulled, updatedFromGoogle, errors })
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Erro desconhecido' })
  }
}
