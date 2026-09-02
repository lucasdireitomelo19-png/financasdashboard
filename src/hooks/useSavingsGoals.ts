import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { SavingsGoal, SavingsGoalContribution } from '../types/database'

export interface SavingsGoalWithTotal extends SavingsGoal {
  saved: number
  pct: number
}

export function useSavingsGoals(userId: string | undefined) {
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [contributions, setContributions] = useState<SavingsGoalContribution[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const [goalsRes, contribRes] = await Promise.all([
      supabase.from('savings_goals').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('savings_goal_contributions').select('*').eq('user_id', userId).order('date', { ascending: false }),
    ])
    setGoals(goalsRes.data ?? [])
    setContributions(contribRes.data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const goalsWithTotals: SavingsGoalWithTotal[] = useMemo(
    () =>
      goals.map((g) => {
        const saved = contributions.filter((c) => c.goal_id === g.id).reduce((s, c) => s + Number(c.amount), 0)
        return { ...g, saved, pct: g.target_amount > 0 ? Math.min(100, (saved / g.target_amount) * 100) : 0 }
      }),
    [goals, contributions],
  )

  const create = async (input: Omit<SavingsGoal, 'id' | 'created_at' | 'user_id'>) => {
    if (!userId) return { error: 'Sem usuário' }
    const { error } = await supabase.from('savings_goals').insert({ ...input, user_id: userId })
    if (!error) await refetch()
    return { error: error?.message ?? null }
  }

  const update = async (id: string, input: Partial<Omit<SavingsGoal, 'id' | 'user_id'>>) => {
    const { error } = await supabase.from('savings_goals').update(input).eq('id', id)
    if (!error) await refetch()
    return { error: error?.message ?? null }
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('savings_goals').delete().eq('id', id)
    if (!error) await refetch()
    return { error: error?.message ?? null }
  }

  const addContribution = async (input: Omit<SavingsGoalContribution, 'id' | 'created_at' | 'user_id'>) => {
    if (!userId) return { error: 'Sem usuário' }
    const { error } = await supabase.from('savings_goal_contributions').insert({ ...input, user_id: userId })
    if (!error) await refetch()
    return { error: error?.message ?? null }
  }

  const removeContribution = async (id: string) => {
    const { error } = await supabase.from('savings_goal_contributions').delete().eq('id', id)
    if (!error) await refetch()
    return { error: error?.message ?? null }
  }

  const contributionsFor = (goalId: string) => contributions.filter((c) => c.goal_id === goalId)

  return { goals: goalsWithTotals, loading, refetch, create, update, remove, addContribution, removeContribution, contributionsFor }
}
