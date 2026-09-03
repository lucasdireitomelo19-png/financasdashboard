import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getUserFromRequest } from '../_lib/supabaseAdmin'

/** DIAGNÓSTICO TEMPORÁRIO — isola se importar/usar supabaseAdmin.ts é o
 * que derruba a função. Devolve sempre 200 com o erro real no corpo (se
 * houver), pra aparecer direto na aba Network. Remover depois. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await getUserFromRequest(req)
    res.status(200).json({ ok: true, userId: user?.id ?? null })
  } catch (err) {
    res.status(200).json({
      ok: false,
      crashed: true,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : null,
    })
  }
}
