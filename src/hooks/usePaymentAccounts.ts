import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { PaymentAccount } from '../types/database'

export function usePaymentAccounts(userId: string | undefined) {
  const [accounts, setAccounts] = useState<PaymentAccount[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from('payment_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('archived', { ascending: true })
      .order('created_at', { ascending: true })
    setAccounts(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const create = async (input: Omit<PaymentAccount, 'id' | 'created_at' | 'user_id'>) => {
    if (!userId) return { error: 'Sem usuário' }
    const { error } = await supabase.from('payment_accounts').insert({ ...input, user_id: userId })
    if (!error) await refetch()
    return { error: error?.message ?? null }
  }

  const update = async (id: string, input: Partial<Omit<PaymentAccount, 'id' | 'user_id'>>) => {
    const { error } = await supabase.from('payment_accounts').update(input).eq('id', id)
    if (!error) await refetch()
    return { error: error?.message ?? null }
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('payment_accounts').delete().eq('id', id)
    if (!error) await refetch()
    return { error: error?.message ?? null }
  }

  return { accounts, loading, refetch, create, update, remove }
}
