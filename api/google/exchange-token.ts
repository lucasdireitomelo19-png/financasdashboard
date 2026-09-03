import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

/** DIAGNÓSTICO 4 — isola se a chamada de rede client.auth.getUser(token)
 * (validar o JWT do usuário contra o Supabase Auth) é o que derruba a
 * função. Tudo inline, sem passar pelo _lib/supabaseAdmin.ts. Remover
 * depois. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth = req.headers.authorization
    if (!auth || !auth.startsWith('Bearer ')) {
      res.status(200).json({ ok: false, reason: 'no-auth-header' })
      return
    }

    const url = process.env.VITE_SUPABASE_URL
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY
    if (!url || !anonKey) {
      res.status(200).json({ ok: false, reason: 'missing-env', hasUrl: !!url, hasAnonKey: !!anonKey })
      return
    }

    const client = createClient(url, anonKey, { auth: { persistSession: false } })
    const token = auth.slice('Bearer '.length)
    const { data, error } = await client.auth.getUser(token)

    res.status(200).json({ ok: true, hasUser: !!data.user, error: error?.message ?? null })
  } catch (err) {
    res.status(200).json({
      ok: false,
      crashed: true,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : null,
    })
  }
}
