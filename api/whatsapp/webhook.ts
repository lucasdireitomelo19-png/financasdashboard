import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const TIMEZONE = 'America/Sao_Paulo'
const GRAPH_VERSION = 'v21.0'

function todayIsoInTimezone(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Normaliza o número que a Meta manda (só dígitos, com DDI, ex:
 * "5511999998888") pro mesmo formato salvo em whatsapp_links. */
function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '')
}

async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  if (!phoneNumberId || !token) throw new Error('WHATSAPP_PHONE_NUMBER_ID/WHATSAPP_ACCESS_TOKEN não configurados')

  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body } }),
  })
  if (!res.ok) {
    // não deixamos isso derrubar o webhook — se a resposta falhar, o
    // lançamento já foi criado, só a confirmação que não chegou
    console.error('Falha ao enviar mensagem WhatsApp:', res.status, await res.text())
  }
}

interface ParsedExpenseMessage {
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
function parseExpenseMessage(raw: string): ParsedExpenseMessage | null {
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
function matchCategory(description: string, categories: { id: string; name: string; type: string }[], type: 'expense' | 'income'): string | null {
  const lower = stripDiacritics(description.toLowerCase())
  for (const c of categories) {
    if (c.type !== type) continue
    if (lower.includes(stripDiacritics(c.name.toLowerCase()))) return c.id
  }
  return null
}

interface WhatsAppWebhookBody {
  entry?: {
    changes?: {
      value?: {
        messages?: { from: string; type: string; text?: { body: string } }[]
      }
    }[]
  }[]
}

/** Webhook do WhatsApp Cloud API (Meta). GET é a verificação que a Meta faz
 * ao cadastrar a URL; POST é onde as mensagens chegam de verdade.
 *
 * Tudo embutido neste arquivo (sem importar de api/_lib) porque importar
 * de outros arquivos dentro de /api estava derrubando a função na Vercel
 * (FUNCTION_INVOCATION_FAILED) — só imports de pacotes do node_modules
 * funcionam nesse ambiente. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      res.status(200).send(String(challenge ?? ''))
      return
    }
    res.status(403).send('Forbidden')
    return
  }

  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }

  try {
    const body = req.body as WhatsAppWebhookBody
    const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
    if (!message || message.type !== 'text' || !message.text?.body) {
      // pode ser um evento de status (entregue/lido) — nada a fazer
      res.status(200).json({ ok: true })
      return
    }

    const from = message.from
    const phone = normalizePhone(from)
    const text = message.text.body

    const serviceUrl = process.env.VITE_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceUrl || !serviceKey) throw new Error('Variáveis de ambiente do Supabase (service role) não configuradas na Vercel.')
    const admin = createClient(serviceUrl, serviceKey, { auth: { persistSession: false } })

    const { data: link } = await admin.from('whatsapp_links').select('user_id').eq('phone_number', phone).maybeSingle()

    if (!link) {
      await sendWhatsAppMessage(from, 'Esse número ainda não está vinculado a nenhuma conta. Cadastre ele em Configurações → WhatsApp no app.')
      res.status(200).json({ ok: true })
      return
    }

    const parsed = parseExpenseMessage(text)
    if (!parsed) {
      await sendWhatsAppMessage(from, 'Não entendi 🤔 Manda assim: "gastei 50 no mercado" ou "recebi 200 de freelance".')
      res.status(200).json({ ok: true })
      return
    }

    const { data: categories } = await admin.from('categories').select('id, name, type').eq('user_id', link.user_id)
    const categoryId = matchCategory(parsed.description, categories ?? [], parsed.type)

    const { error: insertError } = await admin.from('transactions').insert({
      user_id: link.user_id,
      type: parsed.type,
      amount: parsed.amount,
      description: parsed.description,
      date: todayIsoInTimezone(),
      category_id: categoryId,
      is_variable: true,
    })

    if (insertError) {
      await sendWhatsAppMessage(from, 'Deu erro ao salvar 😕 Tenta de novo em instantes.')
      res.status(200).json({ ok: true })
      return
    }

    const emoji = parsed.type === 'expense' ? '💸' : '💰'
    const label = parsed.type === 'expense' ? 'Gasto' : 'Entrada'
    const catName = categories?.find((c) => c.id === categoryId)?.name
    await sendWhatsAppMessage(from, `${emoji} ${label} de ${formatBRL(parsed.amount)} registrado: ${parsed.description}${catName ? ` (${catName})` : ''}`)

    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Erro no webhook do WhatsApp:', err)
    // sempre 200 pra Meta não entrar em loop de retry
    res.status(200).json({ ok: false })
  }
}
