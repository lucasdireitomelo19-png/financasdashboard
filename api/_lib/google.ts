const TOKEN_URL = 'https://oauth2.googleapis.com/token'
export const CALENDAR_TIMEZONE = 'America/Sao_Paulo'

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope: string
}

export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenResponse> {
  const params = new URLSearchParams({
    code,
    client_id: process.env.VITE_GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  })
  const res = await fetch(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params })
  if (!res.ok) throw new Error(`Falha ao trocar código com o Google: ${await res.text()}`)
  return (await res.json()) as TokenResponse
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const params = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: process.env.VITE_GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    grant_type: 'refresh_token',
  })
  const res = await fetch(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params })
  if (!res.ok) throw new Error(`Falha ao renovar token do Google: ${await res.text()}`)
  return (await res.json()) as TokenResponse
}

export interface GoogleEvent {
  id: string
  summary?: string
  description?: string
  status?: string
  updated?: string
  start?: { date?: string; dateTime?: string }
  end?: { date?: string; dateTime?: string }
}

async function googleFetch<T>(accessToken: string, path: string, init?: RequestInit): Promise<T | null> {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`Google Calendar API (${path}): ${res.status} ${await res.text()}`)
  return res.status === 204 ? null : ((await res.json()) as T)
}

export async function listGoogleEvents(accessToken: string, calendarId: string, timeMinIso: string, timeMaxIso: string): Promise<GoogleEvent[]> {
  const params = new URLSearchParams({ timeMin: timeMinIso, timeMax: timeMaxIso, singleEvents: 'true', maxResults: '250' })
  const data = await googleFetch<{ items?: GoogleEvent[] }>(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events?${params}`)
  return (data?.items ?? []).filter((e) => e.status !== 'cancelled')
}

function toGoogleTime(date: string, time: string | null) {
  if (!time) return { date }
  return { dateTime: `${date}T${time}:00`, timeZone: CALENDAR_TIMEZONE }
}

export async function createGoogleEvent(accessToken: string, calendarId: string, event: { title: string; date: string; time: string | null; notes: string | null }): Promise<GoogleEvent> {
  const start = toGoogleTime(event.date, event.time)
  const endTime = event.time ? addOneHour(event.time) : null
  const end = event.time ? { dateTime: `${event.date}T${endTime}:00`, timeZone: CALENDAR_TIMEZONE } : { date: nextDay(event.date) }
  const created = await googleFetch<GoogleEvent>(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    body: JSON.stringify({ summary: event.title, description: event.notes ?? undefined, start, end }),
  })
  return created!
}

export async function updateGoogleEvent(
  accessToken: string,
  calendarId: string,
  googleEventId: string,
  event: { title: string; date: string; time: string | null; notes: string | null },
): Promise<GoogleEvent> {
  const start = toGoogleTime(event.date, event.time)
  const endTime = event.time ? addOneHour(event.time) : null
  const end = event.time ? { dateTime: `${event.date}T${endTime}:00`, timeZone: CALENDAR_TIMEZONE } : { date: nextDay(event.date) }
  const updated = await googleFetch<GoogleEvent>(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ summary: event.title, description: event.notes ?? undefined, start, end }),
  })
  return updated!
}

function addOneHour(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const total = (h + 1) % 24
  return `${String(total).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function nextDay(dateIso: string): string {
  const [y, m, d] = dateIso.split('-').map(Number)
  const next = new Date(y, m - 1, d + 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
}

/** Extrai data (YYYY-MM-DD) e hora (HH:MM, ou null se evento de dia
 * inteiro) de um evento do Google, no fuso horário do calendário. */
export function parseGoogleEventDateTime(ev: GoogleEvent): { date: string; time: string | null } {
  if (ev.start?.date) return { date: ev.start.date, time: null }
  const dt = new Date(ev.start!.dateTime!)
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: CALENDAR_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = Object.fromEntries(fmt.formatToParts(dt).map((p) => [p.type, p.value]))
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` }
}
