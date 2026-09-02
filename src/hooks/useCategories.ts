import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Category, TransactionType } from '../types/database'

export function useCategories(userId: string | undefined) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase.from('categories').select('*').eq('user_id', userId).order('name')
    setCategories(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const create = async (input: { name: string; type: TransactionType; color: string; icon: string }) => {
    if (!userId) return { error: 'Sem usuário' }
    const { error } = await supabase.from('categories').insert({ ...input, user_id: userId, is_default: false })
    if (!error) await refetch()
    return { error: error?.message ?? null }
  }

  const update = async (id: string, input: Partial<Pick<Category, 'name' | 'color' | 'icon'>>) => {
    const { error } = await supabase.from('categories').update(input).eq('id', id)
    if (!error) await refetch()
    return { error: error?.message ?? null }
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (!error) await refetch()
    return { error: error?.message ?? null }
  }

  const byType = (type: TransactionType) => categories.filter((c) => c.type === type)

  return { categories, loading, refetch, create, update, remove, byType }
}
