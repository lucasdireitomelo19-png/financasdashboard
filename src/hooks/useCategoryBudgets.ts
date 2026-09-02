import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { CategoryBudget } from '../types/database'

export function useCategoryBudgets(userId: string | undefined) {
  const [budgets, setBudgets] = useState<CategoryBudget[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase.from('category_budgets').select('*').eq('user_id', userId)
    setBudgets(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const setBudget = async (categoryId: string, monthlyLimit: number) => {
    if (!userId) return { error: 'Sem usuário' }
    const { error } = await supabase
      .from('category_budgets')
      .upsert({ user_id: userId, category_id: categoryId, monthly_limit: monthlyLimit }, { onConflict: 'user_id,category_id' })
    if (!error) await refetch()
    return { error: error?.message ?? null }
  }

  const removeBudget = async (categoryId: string) => {
    if (!userId) return { error: 'Sem usuário' }
    const { error } = await supabase.from('category_budgets').delete().eq('user_id', userId).eq('category_id', categoryId)
    if (!error) await refetch()
    return { error: error?.message ?? null }
  }

  const budgetFor = (categoryId: string) => budgets.find((b) => b.category_id === categoryId) ?? null

  return { budgets, loading, refetch, setBudget, removeBudget, budgetFor }
}
