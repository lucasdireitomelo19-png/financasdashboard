import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { CreditCardBillPayment } from '../types/database'

export function useBillPayments(userId: string | undefined) {
  const [payments, setPayments] = useState<CreditCardBillPayment[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase.from('credit_card_bill_payments').select('*').eq('user_id', userId)
    setPayments(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const isPaid = (accountId: string, cycleKey: string) => payments.some((p) => p.account_id === accountId && p.cycle_key === cycleKey && p.paid)

  const markPaid = async (accountId: string, cycleKey: string) => {
    if (!userId) return { error: 'Sem usuário' }
    const { error } = await supabase
      .from('credit_card_bill_payments')
      .upsert({ account_id: accountId, user_id: userId, cycle_key: cycleKey, paid: true, paid_date: new Date().toISOString().slice(0, 10) }, { onConflict: 'account_id,cycle_key' })
    if (!error) await refetch()
    return { error: error?.message ?? null }
  }

  const markUnpaid = async (accountId: string, cycleKey: string) => {
    const { error } = await supabase.from('credit_card_bill_payments').delete().eq('account_id', accountId).eq('cycle_key', cycleKey)
    if (!error) await refetch()
    return { error: error?.message ?? null }
  }

  return { payments, loading, refetch, isPaid, markPaid, markUnpaid }
}
