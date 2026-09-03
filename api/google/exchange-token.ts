import type { VercelRequest, VercelResponse } from '@vercel/node'

/** DIAGNÓSTICO 3 — testa se importar @supabase/supabase-js diretamente
 * (sem passar pelo nosso _lib/supabaseAdmin.ts) já derruba a função.
 * Import dinâmico dentro do try pra garantir que qualquer erro de
 * carregamento do módulo também seja capturado. Remover depois. */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const client = createClient('https://example.supabase.co', 'fake-key', { auth: { persistSession: false } })
    res.status(200).json({ ok: true, hasClient: !!client })
  } catch (err) {
    res.status(200).json({
      ok: false,
      crashed: true,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : null,
    })
  }
}
