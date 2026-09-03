import type { VercelRequest, VercelResponse } from '@vercel/node'

/** DIAGNÓSTICO TEMPORÁRIO — handler mínimo pra isolar se o erro é de
 * plataforma/build ou de algo dentro da lógica original. Remover depois. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ ok: true, method: req.method })
}
