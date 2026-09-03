import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type User } from '@supabase/supabase-js'

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

/** Tudo embutido neste arquivo (sem importar de api/_lib) porque importar
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
