import { format } from 'date-fns'
import type { PaymentAccount } from '../types/database'

export interface CreditCardCycle {
  /** primeiro dia do ciclo (dia seguinte ao fechamento anterior) */
  start: Date
  /** dia de fechamento deste ciclo */
  end: Date
  dueDate: Date
  /** identifica o ciclo pelo mês em que ele fecha, ex: "2026-09" */
  key: string
}

export interface VrCycle {
  start: Date
  end: Date
  key: string
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Ciclo de fatura de cartão que FECHA no mês/ano informado. */
function creditCardCycleClosingAt(closingDay: number, dueDay: number, closeYear: number, closeMonthIndex: number): CreditCardCycle {
  const end = new Date(closeYear, closeMonthIndex, closingDay)
  const start = new Date(closeYear, closeMonthIndex - 1, closingDay + 1)
  const dueDate = dueDay > closingDay ? new Date(closeYear, closeMonthIndex, dueDay) : new Date(closeYear, closeMonthIndex + 1, dueDay)
  return { start, end, dueDate, key: format(end, 'yyyy-MM') }
}

/** Ciclo (fatura) atualmente aberto — ainda não fechou. */
export function currentCreditCardCycle(account: PaymentAccount, today = new Date()): CreditCardCycle {
  const closingDay = account.closing_day ?? 1
  const dueDay = account.due_day ?? closingDay
  let monthIndex = today.getMonth()
  const year = today.getFullYear()
  if (today.getDate() > closingDay) monthIndex += 1
  return creditCardCycleClosingAt(closingDay, dueDay, year, monthIndex)
}

/** Últimas `count` faturas já fechadas, da mais recente para a mais antiga. */
export function previousCreditCardCycles(account: PaymentAccount, count: number, today = new Date()): CreditCardCycle[] {
  const closingDay = account.closing_day ?? 1
  const dueDay = account.due_day ?? closingDay
  const current = currentCreditCardCycle(account, today)
  const list: CreditCardCycle[] = []
  for (let i = 1; i <= count; i++) {
    const ref = new Date(current.end.getFullYear(), current.end.getMonth() - i, 1)
    list.push(creditCardCycleClosingAt(closingDay, dueDay, ref.getFullYear(), ref.getMonth()))
  }
  return list
}

/** Ciclo do vale (VR/VA) que atualmente está em uso — do último crédito até o dia anterior ao próximo. */
export function currentVrCycle(account: PaymentAccount, today = new Date()): VrCycle {
  const creditDay = account.credit_day ?? 1
  const day = today.getDate()
  let startMonth = today.getMonth()
  const year = today.getFullYear()
  if (day < creditDay) startMonth -= 1
  const start = new Date(year, startMonth, creditDay)
  const end = new Date(year, startMonth + 1, creditDay - 1)
  return { start, end, key: format(start, 'yyyy-MM') }
}

export function previousVrCycles(account: PaymentAccount, count: number, today = new Date()): VrCycle[] {
  const creditDay = account.credit_day ?? 1
  const current = currentVrCycle(account, today)
  const list: VrCycle[] = []
  for (let i = 1; i <= count; i++) {
    const ref = new Date(current.start.getFullYear(), current.start.getMonth() - i, 1)
    const start = new Date(ref.getFullYear(), ref.getMonth(), creditDay)
    const end = new Date(ref.getFullYear(), ref.getMonth() + 1, creditDay - 1)
    list.push({ start, end, key: format(start, 'yyyy-MM') })
  }
  return list
}

export function cycleRangeIso(cycle: { start: Date; end: Date }): { start: string; end: string } {
  return { start: toIso(cycle.start), end: toIso(cycle.end) }
}

export function dateToIso(d: Date): string {
  return toIso(d)
}
