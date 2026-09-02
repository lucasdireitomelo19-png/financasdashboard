export interface ParsedExpenseMessage {
  type: 'expense' | 'income'
  amount: number
  description: string
}

const INCOME_WORDS = /\b(recebi|ganhei|entrou|caiu)\b/i
const EXPENSE_WORDS = /\b(gastei|paguei|comprei|gasto)\b/i
const AMOUNT_RE = /(?:r\$\s*)?(\d+(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:\.\d{1,2})?)/i

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Interpreta uma mensagem curta em português ("gastei 50 no mercado",
 * "recebi 200 de freelance", "35,90 farmácia") como um lançamento. Devolve
 * null se não achar nenhum valor em dinheiro na mensagem. Puramente por
 * regras, sem IA. */
export function parseExpenseMessage(raw: string): ParsedExpenseMessage | null {
  const text = raw.trim()
  if (!text) return null

  const lower = stripDiacritics(text.toLowerCase())
  const type: 'expense' | 'income' = INCOME_WORDS.test(lower) ? 'income' : 'expense'

  const amountMatch = text.match(AMOUNT_RE)
  if (!amountMatch) return null

  let amountStr = amountMatch[1]
  if (amountStr.includes(',')) {
    amountStr = amountStr.replace(/\./g, '').replace(',', '.')
  }
  const amount = Number(amountStr)
  if (!amount || amount <= 0) return null

  let description = text.replace(new RegExp(escapeRegex(amountMatch[0]), 'i'), '')
  description = description.replace(INCOME_WORDS, '').replace(EXPENSE_WORDS, '')
  description = description.replace(/^\s*(de|do|da|no|na|em|por|pra|para)\s+/i, '')
  description = description.replace(/\s+(de|do|da|no|na|em|por|pra|para)\s*$/i, '')
  description = description.replace(/\s{2,}/g, ' ').trim()
  if (!description) description = type === 'expense' ? 'Gasto via WhatsApp' : 'Entrada via WhatsApp'
  description = description.charAt(0).toUpperCase() + description.slice(1)

  return { type, amount, description }
}

/** Tenta achar, por nome, uma categoria do usuário que apareça na
 * descrição (ex: descrição "mercado" bate com a categoria "Mercado"). */
export function matchCategory(description: string, categories: { id: string; name: string; type: string }[], type: 'expense' | 'income'): string | null {
  const lower = stripDiacritics(description.toLowerCase())
  for (const c of categories) {
    if (c.type !== type) continue
    if (lower.includes(stripDiacritics(c.name.toLowerCase()))) return c.id
  }
  return null
}
