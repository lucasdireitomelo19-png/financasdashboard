import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { computeDueOccurrences } from '../lib/recurrence'
import { todayIso } from '../lib/format'
import type { RecurringTemplate } from '../types/database'

/** Gera automaticamente as transações de templates recorrentes ativos que
 * já venceram (ex: aluguel do mês, salário) e ainda não foram lançadas. */
export function useRecurringSync(userId: string | undefined, onSynced?: () => void) {
  const ran = useRef<string | null>(null)

  useEffect(() => {
    if (!userId || ran.current === userId) return
    ran.current = userId

    const run = async () => {
      const { data: templates } = await supabase
        .from('recurring_templates')
        .select('*')
        .eq('user_id', userId)
        .eq('active', true)

      if (!templates || templates.length === 0) return

      const today = todayIso()
      let generatedAny = false

      for (const template of templates as RecurringTemplate[]) {
        const dueDates = computeDueOccurrences(template, today)
        if (dueDates.length === 0) continue

        const rows = dueDates.map((date) => ({
          user_id: userId,
          type: template.type,
          amount: template.amount,
          category_id: template.category_id,
          description: template.description,
          date,
          payment_method: template.payment_method,
          is_variable: false,
          recurring_template_id: template.id,
          account_id: template.account_id,
          notes: null,
        }))

        const { error: insertError } = await supabase.from('transactions').insert(rows)
        if (insertError) continue

        await supabase
          .from('recurring_templates')
          .update({ last_generated_date: dueDates[dueDates.length - 1] })
          .eq('id', template.id)

        generatedAny = true
      }

      if (generatedAny) onSynced?.()
    }

    void run()
  }, [userId, onSynced])
}
