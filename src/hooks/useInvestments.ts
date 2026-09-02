import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Investment, InvestmentMovement } from '../types/database'

export interface InvestmentWithTotals extends Investment {
  invested: number
  currentValue: number
  gain: number
  gainPct: number
}

export function useInvestments(userId: string | undefined) {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [movements, setMovements] = useState<InvestmentMovement[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const [investmentsRes, movementsRes] = await Promise.all([
      supabase.from('investments').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('investment_movements').select('*').eq('user_id', userId).order('date', { ascending: false }),
    ])
    setInvestments(investmentsRes.data ?? [])
    setMovements(movementsRes.data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const withTotals: InvestmentWithTotals[] = useMemo(() => {
    return investments.map((inv) => {
      const mine = movements.filter((m) => m.investment_id === inv.id)
      let invested = 0
      let currentValue = 0
      for (const m of mine) {
        if (m.type === 'aporte') {
          invested += Number(m.amount)
          currentValue += Number(m.amount)
        } else if (m.type === 'resgate') {
          invested -= Number(m.amount)
          currentValue -= Number(m.amount)
        } else if (m.type === 'rendimento' || m.type === 'ajuste') {
          currentValue += Number(m.amount)
        }
      }
      const gain = currentValue - invested
      const gainPct = invested > 0 ? (gain / invested) * 100 : 0
      return { ...inv, invested, currentValue, gain, gainPct }
    })
  }, [investments, movements])

  const create = async (input: Omit<Investment, 'id' | 'created_at' | 'user_id'>) => {
    if (!userId) return { error: 'Sem usuário', id: null }
    const { data, error } = await supabase.from('investments').insert({ ...input, user_id: userId }).select().single()
    if (!error) await refetch()
    return { error: error?.message ?? null, id: data?.id ?? null }
  }

  const update = async (id: string, input: Partial<Omit<Investment, 'id' | 'user_id'>>) => {
    const { error } = await supabase.from('investments').update(input).eq('id', id)
    if (!error) await refetch()
    return { error: error?.message ?? null }
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('investments').delete().eq('id', id)
    if (!error) await refetch()
    return { error: error?.message ?? null }
  }

  const addMovement = async (input: Omit<InvestmentMovement, 'id' | 'created_at' | 'user_id'>) => {
    if (!userId) return { error: 'Sem usuário' }
    const { error } = await supabase.from('investment_movements').insert({ ...input, user_id: userId })
    if (!error) await refetch()
    return { error: error?.message ?? null }
  }

  const removeMovement = async (id: string) => {
    const { error } = await supabase.from('investment_movements').delete().eq('id', id)
    if (!error) await refetch()
    return { error: error?.message ?? null }
  }

  const movementsFor = (investmentId: string) => movements.filter((m) => m.investment_id === investmentId)

  return { investments: withTotals, movements, loading, refetch, create, update, remove, addMovement, removeMovement, movementsFor }
}
