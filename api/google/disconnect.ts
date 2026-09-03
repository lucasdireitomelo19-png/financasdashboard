import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getServiceClient, getUserFromRequest } from '../_lib/supabaseAdmin'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })

  try {
    const user = await getUserFromRequest(req)
    if (!user) return res.status(401).json({ error: 'Não autenticado' })

    const admin = getServiceClient()
    const { data: existing } = await admin.from('google_calendar_connections').select('access_token').eq('user_id', user.id).maybeSingle()

    if (existing?.access_token) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(existing.access_token)}`, { method: 'POST' })
      } catch {
        // revogar é best-effort — se falhar, ainda assim removemos a conexão local
      }
    }

    const { error } = await admin.from('google_calendar_connections').delete().eq('user_id', user.id)
    if (error) return res.status(500).json({ error: error.message })

    return res.status(200).json({ disconnected: true })
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Erro desconhecido' })
  }
}
