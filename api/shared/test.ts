import type { VercelRequest, VercelResponse } from '@vercel/node'

export const TEST_CONSTANT = 'america/sao_paulo'

/** Export default só por segurança, caso a Vercel exija um handler
 * padrão pra qualquer .ts direto sob /api (mesmo não sendo chamado). */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(404).json({ error: 'not a route' })
}
