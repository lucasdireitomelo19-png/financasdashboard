import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

/** Cliente com a service role — só roda no servidor (functions da Vercel),
 * nunca no navegador. Ignora RLS, então todo acesso aqui precisa vir de um
 * usuário já verificado por getUserFromRequest(). */
export function getServiceClient(): SupabaseClient {
  const url = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Variáveis de ambiente do Supabase (service role) não configuradas na Vercel.')
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

/** Extrai e valida o JWT do Supabase enviado pelo app no header
 * Authorization: Bearer <token>. Devolve o usuário autenticado ou null. */
export async function getUserFromRequest(req: { headers: Record<string, string | string[] | undefined> }): Promise<User | null> {
  const auth = req.headers.authorization ?? req.headers.Authorization
  const token = Array.isArray(auth) ? auth[0] : auth
  if (!token || !token.startsWith('Bearer ')) return null

  const url = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null

  const client = createClient(url, anonKey, { auth: { persistSession: false } })
  const { data, error } = await client.auth.getUser(token.slice('Bearer '.length))
  if (error || !data.user) return null
  return data.user
}
