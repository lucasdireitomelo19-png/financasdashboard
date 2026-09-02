import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { AgendaEvent } from '../types/database'

export function useAgendaEvents(userId: string | undefined) {
  const [events, setEvents] = useState<AgendaEvent[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from('agenda_events')
      .select('*')
      .eq('user_id', userId)
      .order('event_date', { ascending: true })
      .order('event_time', { ascending: true, nullsFirst: false })
    setEvents(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const create = async (input: Omit<AgendaEvent, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
    if (!userId) return { error: 'Sem usuário' }
    const { error } = await supabase.from('agenda_events').insert({ ...input, user_id: userId })
    if (!error) await refetch()
    return { error: error?.message ?? null }
  }

  const update = async (id: string, input: Partial<Omit<AgendaEvent, 'id' | 'user_id'>>) => {
    const { error } = await supabase
      .from('agenda_events')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) await refetch()
    return { error: error?.message ?? null }
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('agenda_events').delete().eq('id', id)
    if (!error) await refetch()
    return { error: error?.message ?? null }
  }

  const toggleDone = async (e: AgendaEvent) => {
    await update(e.id, { done: !e.done })
  }

  return { events, loading, refetch, create, update, remove, toggleDone }
}
