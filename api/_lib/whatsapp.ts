const GRAPH_VERSION = 'v21.0'

/** Envia uma mensagem de texto pelo WhatsApp Cloud API (Meta). `to` é o
 * número no formato que a Meta manda no webhook (só dígitos, com DDI). */
export async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  if (!phoneNumberId || !token) throw new Error('WHATSAPP_PHONE_NUMBER_ID/WHATSAPP_ACCESS_TOKEN não configurados')

  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body },
    }),
  })
  if (!res.ok) {
    // não deixamos isso derrubar o webhook — se a resposta falhar, o
    // lançamento já foi criado, só a confirmação que não chegou
    console.error('Falha ao enviar mensagem WhatsApp:', res.status, await res.text())
  }
}
