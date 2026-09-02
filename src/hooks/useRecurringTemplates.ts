import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { RecurringTemplate } from '../types/database'

export function useRecurringTemplates(userId: string | undefined) {
  const [templates, setTemplates] = useState<RecurringTemplate[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from('recurring_templates')
      .select('*')
      .eq('user_id', userId)
      .order('active', { ascending: false })
      .order('description')
    setTemplates(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const create = async (input: Omit<RecurringTemplate, 'id' | 'created_at' | 'user_id' | 'last_generated_date'>) => {
    if (!userId) return { error: 'Sem usuário' }
    const { error } = await supabase.from('recurring_templates').insert({ ...input, user_id: userId })
    if (!error) await refetch()
    return { error: error?.message ?? null }
  }

  const update = async (id: string, input: Partial<Omit<RecurringTemplate, 'id' | 'user_id'>>) => {
    const { error } = await supabase.from('recurring_templates').update(input).eq('id', id)
    if (!error) await refetch()
    return { error: error?.message ?? null }
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('recurring_templates').delete().eq('id', id)
    if (!error) await refetch()
    return { error: error?.message ?? null }
  }

  return { templates, loading, refetch, create, update, remove }
}
