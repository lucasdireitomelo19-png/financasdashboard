import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { buildGoogleAuthUrl, disconnectGoogleCalendar, exchangeGoogleCode, syncGoogleCalendar } from '../lib/googleCalendar'
import type { GoogleCalendarConnection } from '../types/database'

const REDIRECT_PATH = '/agenda'

export function useGoogleCalendar() {
  const { session } = useAuth()
  const [connection, setConnection] = useState<GoogleCalendarConnection | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!session?.user) return
    setLoading(true)
    const { data } = await supabase.from('google_calendar_connections').select('*').eq('user_id', session.user.id).maybeSingle()
    setConnection(data)
    setLoading(false)
  }, [session])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const connect = useCallback(() => {
    const redirectUri = `${window.location.origin}${REDIRECT_PATH}`
    window.location.href = buildGoogleAuthUrl(redirectUri)
  }, [])

  const completeConnection = useCallback(
    async (code: string) => {
      if (!session?.access_token) return { error: 'Sem sessão' }
      const redirectUri = `${window.location.origin}${REDIRECT_PATH}`
      const { error: err } = await exchangeGoogleCode(code, redirectUri, session.access_token)
      if (err) {
        setError(err)
        return { error: err }
      }
      await refetch()
      return { error: null }
    },
    [session, refetch],
  )

  const sync = useCallback(async () => {
    if (!session?.access_token) return { error: 'Sem sessão' }
    setSyncing(true)
    setError(null)
    const { data, error: err } = await syncGoogleCalendar(session.access_token)
    setSyncing(false)
    if (err) {
      setError(err)
      return { error: err }
    }
    await refetch()
    return { error: null, result: data }
  }, [session, refetch])

  const disconnect = useCallback(async () => {
    if (!session?.access_token) return { error: 'Sem sessão' }
    const { error: err } = await disconnectGoogleCalendar(session.access_token)
    if (!err) setConnection(null)
    return { error: err }
  }, [session])

  return { connection, loading, syncing, error, connect, completeConnection, sync, disconnect }
}
