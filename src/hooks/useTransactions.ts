import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Transaction, TransactionType } from '../types/database'

export interface TransactionFilters {
  type?: TransactionType | 'all'
  categoryId?: string | 'all'
  accountId?: string | 'all'
  startDate?: string
  endDate?: string
  paymentMethod?: string | 'all'
  variableOnly?: boolean
  companyOnly?: boolean
  search?: string
}

export function useTransactions(userId: string | undefined, filters: TransactionFilters) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    let query = supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false })

    if (filters.type && filters.type !== 'all') query = query.eq('type', filters.type)
    if (filters.categoryId && filters.categoryId !== 'all') query = query.eq('category_id', filters.categoryId)
    if (filters.accountId && filters.accountId !== 'all') query = query.eq('account_id', filters.accountId)
    if (filters.startDate) query = query.gte('date', filters.startDate)
    if (filters.endDate) query = query.lte('date', filters.endDate)
    if (filters.paymentMethod && filters.paymentMethod !== 'all') query = query.eq('payment_method', filters.paymentMethod)
    if (filters.variableOnly) query = query.eq('is_variable', true)
    if (filters.companyOnly) query = query.eq('is_company', true)
    if (filters.search) query = query.ilike('description', `%${filters.search}%`)

    const { data } = await query.limit(1000)
    setTransactions(data ?? [])
    setLoading(false)
  }, [userId, filters.type, filters.categoryId, filters.accountId, filters.startDate, filters.endDate, filters.paymentMethod, filters.variableOnly, filters.companyOnly, filters.search])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const create = async (input: Omit<Transaction, 'id' | 'created_at' | 'user_id'>) => {
    if (!userId) return { error: 'Sem usuário' }
    const { error } = await supabase.from('transactions').insert({ ...input, user_id: userId })
    if (!error) await refetch()
    return { error: error?.message ?? null }
  }

  const createMany = async (inputs: Omit<Transaction, 'id' | 'created_at' | 'user_id'>[]) => {
    if (!userId) return { error: 'Sem usuário' }
    const rows = inputs.map((input) => ({ ...input, user_id: userId }))
    const { error } = await supabase.from('transactions').insert(rows)
    if (!error) await refetch()
    return { error: error?.message ?? null }
  }

  const update = async (id: string, input: Partial<Omit<Transaction, 'id' | 'user_id'>>) => {
    const { error } = await supabase.from('transactions').update(input).eq('id', id)
    if (!error) await refetch()
    return { error: error?.message ?? null }
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (!error) await refetch()
    return { error: error?.message ?? null }
  }

  const removeInstallmentGroup = async (groupId: string) => {
    const { error } = await supabase.from('transactions').delete().eq('installment_group_id', groupId)
    if (!error) await refetch()
    return { error: error?.message ?? null }
  }

  return { transactions, loading, refetch, create, createMany, update, remove, removeInstallmentGroup }
}
