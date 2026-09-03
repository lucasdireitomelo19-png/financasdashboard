import type { VercelRequest, VercelResponse } from '@vercel/node'
import { CALENDAR_TIMEZONE } from '../_lib/google.js'

/** DIAGNÓSTICO 5 — isola se importar QUALQUER coisa da pasta _lib/ já
 * derruba a função (independente de usar @supabase/supabase-js ou não).
 * CALENDAR_TIMEZONE é só uma constante, sem nenhuma dependência externa.
 * Remover depois. */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    res.status(200).json({ ok: true, timezone: CALENDAR_TIMEZONE })
  } catch (err) {
    res.status(200).json({
      ok: false,
      crashed: true,
      message: err instanceof Error ? err.message : String(err),
    })
  }
}
