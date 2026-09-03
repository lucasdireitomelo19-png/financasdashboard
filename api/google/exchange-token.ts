import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type User } from '@supabase/supabase-js'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope: string
}

async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenResponse> {
  const params = new URLSearchParams({
    code,
    client_id: process.env.VITE_GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  })
  const res = await fetch(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params })
  if (!res.ok) throw new Error(`Falha ao trocar código com o Google: ${await res.text()}`)
  return (await res.json()) as TokenResponse
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

/** Recebe o "code" que o Google devolveu depois do usuário autorizar o
 * acesso, troca por access/refresh token (usando o client secret, que só
 * existe aqui no servidor) e guarda a conexão no Supabase via service
 * role. O navegador nunca vê o client secret nem os tokens.
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

    const { code, redirectUri } = req.body ?? {}
    if (!code || !redirectUri) return res.status(400).json({ error: 'Faltando code/redirectUri' })

    const tokens = await exchangeCodeForTokens(code, redirectUri)

    const serviceUrl = process.env.VITE_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceUrl || !serviceKey) {
      return res.status(500).json({ error: 'Variáveis de ambiente do Supabase (service role) não configuradas na Vercel.' })
    }
    const admin = createClient(serviceUrl, serviceKey, { auth: { persistSession: false } })

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
