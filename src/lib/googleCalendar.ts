const SCOPE = 'https://www.googleapis.com/auth/calendar.events'

export function buildGoogleAuthUrl(redirectUri: string): string {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
  if (!clientId) throw new Error('VITE_GOOGLE_CLIENT_ID não configurado')
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

async function callApi<T>(path: string, accessToken: string, body?: Record<string, unknown>): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body ?? {}),
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error ?? `Erro ${res.status}` }
    return { data: json as T, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erro de rede' }
  }
}

export function exchangeGoogleCode(code: string, redirectUri: string, accessToken: string) {
  return callApi<{ connected: true }>('/api/google/exchange-token', accessToken, { code, redirectUri })
}

export function syncGoogleCalendar(accessToken: string) {
  return callApi<{ pushed: number; pulled: number; updatedFromGoogle: number; errors: string[] }>('/api/google/sync', accessToken)
}

export function disconnectGoogleCalendar(accessToken: string) {
  return callApi<{ disconnected: true }>('/api/google/disconnect', accessToken)
}
