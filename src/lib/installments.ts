import { addMonths, format, parseISO } from 'date-fns'
import type { Transaction } from '../types/database'

export interface InstallmentPlanInput {
  totalAmount: number
  installments: number
  firstDate: string
  description: string
  category_id: string | null
  payment_method: Transaction['payment_method']
  account_id: string | null
}

/** Divide o valor total em N parcelas (a última absorve o arredondamento) e
 * gera uma transação por parcela, uma por mês a partir da data informada. */
export function buildInstallmentRows(input: InstallmentPlanInput): Omit<Transaction, 'id' | 'created_at' | 'user_id'>[] {
  const { totalAmount, installments, firstDate, description, category_id, payment_method, account_id } = input
  const base = Math.round((totalAmount / installments) * 100) / 100
  const rows: Omit<Transaction, 'id' | 'created_at' | 'user_id'>[] = []
  const groupId = crypto.randomUUID()
  let accumulated = 0

  for (let n = 1; n <= installments; n++) {
    const isLast = n === installments
    const amount = isLast ? Math.round((totalAmount - accumulated) * 100) / 100 : base
    accumulated += amount
    const date = format(addMonths(parseISO(firstDate), n - 1), 'yyyy-MM-dd')

    rows.push({
      type: 'expense',
      amount,
      category_id,
      description: `${description} (${n}/${installments})`,
      date,
      payment_method,
      is_variable: false,
      recurring_template_id: null,
      account_id,
      installment_group_id: groupId,
      installment_number: n,
      installment_total: installments,
      notes: null,
    })
  }

  return rows
}

/** Soma o valor de parcelas futuras (ainda não vencidas) — usada como
 * "dívida comprometida" no cálculo de patrimônio líquido. */
export function sumFutureInstallments(transactions: Transaction[], todayIso: string): number {
  return transactions
    .filter((t) => t.installment_group_id && t.type === 'expense' && t.date > todayIso)
    .reduce((s, t) => s + Number(t.amount), 0)
}
