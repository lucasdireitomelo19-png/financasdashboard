import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getServiceClient, getUserFromRequest } from '../_lib/supabaseAdmin'
import { exchangeCodeForTokens } from '../_lib/google'

/** Recebe o "code" que o Google devolveu depois do usuário autorizar o
 * acesso, troca por access/refresh token (usando o client secret, que só
 * existe aqui no servidor) e guarda a conexão no Supabase via service
 * role. O navegador nunca vê o client secret nem os tokens. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })

  try {
    const user = await getUserFromRequest(req)
    if (!user) return res.status(401).json({ error: 'Não autenticado' })

    const { code, redirectUri } = req.body ?? {}
    if (!code || !redirectUri) return res.status(400).json({ error: 'Faltando code/redirectUri' })

    const tokens = await exchangeCodeForTokens(code, redirectUri)
    const admin = getServiceClient()

    const { data: existing } = await admin.from('google_calendar_connections').select('refresh_token').eq('user_id', user.id).maybeSingle()

    const refreshToken = tokens.refresh_token ?? existing?.refresh_token
    if (!refreshToken) {
      return res.status(400).json({ error: 'O Google não devolveu um refresh token. Desconecte o app em myaccount.google.com/permissions e tente conectar de novo.' })
    }

    const { error } = await admin.from('google_calendar_connections').upsert({
      user_id: user.id,
      access_token: tokens.access_token,
      refresh_token: refreshToken,
      access_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      connected_at: new Date().toISOString(),
    })
    if (error) return res.status(500).json({ error: error.message })

    return res.status(200).json({ connected: true })
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Erro desconhecido' })
  }
}
