import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getServiceClient } from '../_lib/supabaseAdmin'
import { parseExpenseMessage, matchCategory } from '../_lib/expenseParser'
import { sendWhatsAppMessage } from '../_lib/whatsapp'

const TIMEZONE = 'America/Sao_Paulo'

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
 * ao cadastrar a URL; POST é onde as mensagens chegam de verdade. */
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

    const admin = getServiceClient()
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
