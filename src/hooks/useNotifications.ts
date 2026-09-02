import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { currentMonthRange, monthsAgoRange } from '../lib/format'
import { computeNotifications, type AppNotification } from '../lib/notifications'
import type { Category, CategoryBudget, CreditCardBillPayment, PaymentAccount, RecurringTemplate, Transaction } from '../types/database'

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { start: recentStart } = monthsAgoRange(2)
    const { end: recentEnd } = currentMonthRange()

    const [accountsRes, budgetsRes, templatesRes, billPaymentsRes, recentTxRes, categoriesRes] = await Promise.all([
      supabase.from('payment_accounts').select('*').eq('user_id', userId).eq('archived', false),
      supabase.from('category_budgets').select('*').eq('user_id', userId),
      supabase.from('recurring_templates').select('*').eq('user_id', userId).eq('active', true),
      supabase.from('credit_card_bill_payments').select('*').eq('user_id', userId),
      supabase.from('transactions').select('*').eq('user_id', userId).gte('date', recentStart).lte('date', recentEnd),
      supabase.from('categories').select('*').eq('user_id', userId),
    ])

    const recentTransactions: Transaction[] = recentTxRes.data ?? []
    const { start: monthStart, end: monthEnd } = currentMonthRange()
    const currentMonthTransactions = recentTransactions.filter((t) => t.date >= monthStart && t.date <= monthEnd)
    const categoryMap = new Map<string, Category>((categoriesRes.data ?? []).map((c: Category) => [c.id, c]))

    setNotifications(
      computeNotifications({
        accounts: (accountsRes.data ?? []) as PaymentAccount[],
        budgets: (budgetsRes.data ?? []) as CategoryBudget[],
        templates: (templatesRes.data ?? []) as RecurringTemplate[],
        billPayments: (billPaymentsRes.data ?? []) as CreditCardBillPayment[],
        recentTransactions,
        currentMonthTransactions,
        categoryMap,
      }),
    )
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { notifications, loading, refetch }
}
