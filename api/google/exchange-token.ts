import type { VercelRequest, VercelResponse } from '@vercel/node'
import { TEST_CONSTANT } from '../shared/test'

/** DIAGNÓSTICO 7 — isola se o problema é específico da pasta com
 * underscore (_lib), testando um import equivalente de uma pasta sem
 * underscore (shared/). Remover depois. */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    res.status(200).json({ ok: true, value: TEST_CONSTANT })
  } catch (err) {
    res.status(200).json({
      ok: false,
      crashed: true,
      message: err instanceof Error ? err.message : String(err),
    })
  }
}
