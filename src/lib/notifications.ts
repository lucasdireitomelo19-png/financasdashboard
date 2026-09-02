import { differenceInCalendarDays, parseISO } from 'date-fns'
import { currentCreditCardCycle, previousCreditCardCycles, computeVrBalance, cycleRangeIso } from './accountCycles'
import { nextOccurrenceAfter } from './recurrence'
import { formatCurrency, todayIso } from './format'
import type { Category, CategoryBudget, CreditCardBillPayment, PaymentAccount, RecurringTemplate, Transaction } from '../types/database'

export interface AppNotification {
  id: string
  severity: 'alert' | 'warning' | 'info'
  title: string
  description: string
  to: string
}

const DUE_SOON_DAYS = 3

interface NotificationsInput {
  accounts: PaymentAccount[]
  budgets: CategoryBudget[]
  templates: RecurringTemplate[]
  billPayments: CreditCardBillPayment[]
  recentTransactions: Transaction[]
  currentMonthTransactions: Transaction[]
  categoryMap: Map<string, Category>
}

export function computeNotifications({
  accounts,
  budgets,
  templates,
  billPayments,
  recentTransactions,
  currentMonthTransactions,
  categoryMap,
}: NotificationsInput): AppNotification[] {
  const notifications: AppNotification[] = []
  const today = new Date()

  for (const account of accounts) {
    if (account.type === 'cartao_credito') {
      const current = currentCreditCardCycle(account, today)
      const daysToClose = differenceInCalendarDays(current.end, today)
      if (daysToClose >= 0 && daysToClose <= DUE_SOON_DAYS) {
        notifications.push({
          id: `cc-close-${account.id}`,
          severity: daysToClose <= 1 ? 'alert' : 'warning',
          title: `Fatura do ${account.name} fecha ${daysToClose === 0 ? 'hoje' : `em ${daysToClose} dia${daysToClose === 1 ? '' : 's'}`}`,
          description: 'Confira os lançamentos antes do fechamento.',
          to: '/contas',
        })
      }

      const previous = previousCreditCardCycles(account, 1, today)[0]
      const { start, end } = cycleRangeIso(previous)
      const previousTotal = recentTransactions
        .filter((t) => t.account_id === account.id && t.type === 'expense' && t.date >= start && t.date <= end)
        .reduce((s, t) => s + Number(t.amount), 0)
      const paid = billPayments.some((p) => p.account_id === account.id && p.cycle_key === previous.key && p.paid)
      const daysToDue = differenceInCalendarDays(previous.dueDate, today)
      if (previousTotal > 0 && !paid && daysToDue >= 0 && daysToDue <= DUE_SOON_DAYS) {
        notifications.push({
          id: `cc-due-${account.id}`,
          severity: daysToDue <= 1 ? 'alert' : 'warning',
          title: `Fatura do ${account.name} vence ${daysToDue === 0 ? 'hoje' : `em ${daysToDue} dia${daysToDue === 1 ? '' : 's'}`}`,
          description: `${formatCurrency(previousTotal)} ainda não marcados como pago.`,
          to: '/contas',
        })
      }
    }

    if (account.type === 'vale' && account.monthly_credit) {
      const balance = computeVrBalance(account, recentTransactions, today)
      const pct = balance / account.monthly_credit
      if (pct <= 0.1) {
        notifications.push({
          id: `vr-low-${account.id}`,
          severity: pct <= 0 ? 'alert' : 'warning',
          title: `Saldo do ${account.name} está acabando`,
          description: `Restam ${formatCurrency(balance)} neste ciclo.`,
          to: '/contas',
        })
      }
    }
  }

  for (const budget of budgets) {
    const cat = categoryMap.get(budget.category_id)
    if (!cat) continue
    const spent = currentMonthTransactions
      .filter((t) => t.category_id === budget.category_id && t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0)
    const pct = spent / budget.monthly_limit
    if (pct >= 1) {
      notifications.push({
        id: `budget-${budget.id}`,
        severity: 'alert',
        title: `Orçamento de ${cat.name} estourado`,
        description: `${formatCurrency(spent)} de ${formatCurrency(budget.monthly_limit)} já gastos este mês.`,
        to: '/categorias',
      })
    } else if (pct >= 0.8) {
      notifications.push({
        id: `budget-${budget.id}`,
        severity: 'warning',
        title: `Orçamento de ${cat.name} quase no limite`,
        description: `${formatCurrency(spent)} de ${formatCurrency(budget.monthly_limit)} (${(pct * 100).toFixed(0)}%) já gastos este mês.`,
        to: '/categorias',
      })
    }
  }

  const today0 = todayIso()
  for (const template of templates) {
    const next = nextOccurrenceAfter(template, today0)
    if (!next) continue
    const daysUntil = differenceInCalendarDays(parseISO(next), today)
    if (daysUntil >= 0 && daysUntil <= DUE_SOON_DAYS) {
      notifications.push({
        id: `rec-${template.id}`,
        severity: 'info',
        title: `${template.description} ${daysUntil === 0 ? 'é cobrado hoje' : `em ${daysUntil} dia${daysUntil === 1 ? '' : 's'}`}`,
        description: `${template.type === 'income' ? 'Entrada' : 'Gasto'} fixo de ${formatCurrency(Number(template.amount))}.`,
        to: '/recorrentes',
      })
    }
  }

  const severityOrder = { alert: 0, warning: 1, info: 2 }
  return notifications.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
}
