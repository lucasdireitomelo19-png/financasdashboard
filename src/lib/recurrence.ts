import { addMonths, addWeeks, addYears, format, isAfter, parseISO } from 'date-fns'
import type { RecurringTemplate } from '../types/database'

function occurrenceAt(template: Pick<RecurringTemplate, 'start_date' | 'frequency'>, n: number): Date {
  const start = parseISO(template.start_date)
  switch (template.frequency) {
    case 'weekly':
      return addWeeks(start, n)
    case 'yearly':
      return addYears(start, n)
    case 'monthly':
    default:
      return addMonths(start, n)
  }
}

const MAX_OCCURRENCES = 300

/** Retorna as datas (YYYY-MM-DD) de ocorrências de um template recorrente
 * que já deveriam ter acontecido (até hoje) e ainda não foram geradas. */
export function computeDueOccurrences(template: RecurringTemplate, todayIso: string): string[] {
  const today = parseISO(todayIso)
  const end = template.end_date ? parseISO(template.end_date) : null
  const lastGen = template.last_generated_date ? parseISO(template.last_generated_date) : null

  const dates: string[] = []
  for (let n = 0; n < MAX_OCCURRENCES; n++) {
    const occ = occurrenceAt(template, n)
    if (isAfter(occ, today)) break
    if (end && isAfter(occ, end)) break
    if (lastGen && !isAfter(occ, lastGen)) continue
    dates.push(format(occ, 'yyyy-MM-dd'))
  }
  return dates
}

export function nextOccurrenceAfter(template: RecurringTemplate, todayIso: string): string | null {
  const today = parseISO(todayIso)
  const end = template.end_date ? parseISO(template.end_date) : null
  for (let n = 0; n < MAX_OCCURRENCES; n++) {
    const occ = occurrenceAt(template, n)
    if (isAfter(occ, today)) {
      if (end && isAfter(occ, end)) return null
      return format(occ, 'yyyy-MM-dd')
    }
  }
  return null
}
