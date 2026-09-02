import { useState } from 'react'
import { ErrorText, FormField, PrimaryButton, Select, TextInput } from './FormField'
import { PAYMENT_METHOD_LABELS } from '../lib/constants'
import { todayIso } from '../lib/format'
import type { Category, PaymentMethod, RecurrenceFrequency, RecurringTemplate, TransactionType } from '../types/database'

export interface RecurringFormValues {
  type: TransactionType
  amount: string
  category_id: string
  description: string
  frequency: RecurrenceFrequency
  start_date: string
  end_date: string
  payment_method: PaymentMethod | ''
  active: boolean
}

function toValues(t?: RecurringTemplate | null): RecurringFormValues {
  if (!t) {
    return { type: 'expense', amount: '', category_id: '', description: '', frequency: 'monthly', start_date: todayIso(), end_date: '', payment_method: '', active: true }
  }
  return {
    type: t.type,
    amount: String(t.amount),
    category_id: t.category_id ?? '',
    description: t.description,
    frequency: t.frequency,
    start_date: t.start_date,
    end_date: t.end_date ?? '',
    payment_method: t.payment_method ?? '',
    active: t.active,
  }
}

export function RecurringForm({
  initial,
  categories,
  onCancel,
  onSubmit,
}: {
  initial?: RecurringTemplate | null
  categories: Category[]
  onCancel: () => void
  onSubmit: (values: RecurringFormValues) => Promise<{ error: string | null }>
}) {
  const [values, setValues] = useState<RecurringFormValues>(toValues(initial))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const filteredCategories = categories.filter((c) => c.type === values.type)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!values.amount || Number(values.amount) <= 0) {
      setError('Informe um valor válido.')
      return
    }
    if (!values.description.trim()) {
      setError('Informe uma descrição (ex: Aluguel, Salário, Netflix).')
      return
    }
    setSaving(true)
    const result = await onSubmit(values)
    setSaving(false)
    if (result.error) setError(result.error)
  }

  return (
    <form onSubmit={handleSubmit}>
      <ErrorText>{error}</ErrorText>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setValues((v) => ({ ...v, type: 'expense', category_id: '' }))}
          className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
            values.type === 'expense' ? 'border-rose-500 bg-rose-500/10 text-rose-400' : 'border-cyan-500/20 text-slate-400'
          }`}
        >
          💸 Gasto fixo
        </button>
        <button
          type="button"
          onClick={() => setValues((v) => ({ ...v, type: 'income', category_id: '' }))}
          className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
            values.type === 'income' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-cyan-500/20 text-slate-400'
          }`}
        >
          💰 Entrada fixa
        </button>
      </div>

      <FormField label="Descrição">
        <TextInput
          type="text"
          required
          autoFocus
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          placeholder="Ex: Aluguel, Salário, Netflix..."
        />
      </FormField>

      <div className="grid grid-cols-2 gap-2">
        <FormField label="Valor (R$)">
          <TextInput
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            required
            value={values.amount}
            onChange={(e) => setValues((v) => ({ ...v, amount: e.target.value }))}
            placeholder="0,00"
          />
        </FormField>

        <FormField label="Categoria">
          <Select value={values.category_id} onChange={(e) => setValues((v) => ({ ...v, category_id: e.target.value }))}>
            <option value="">Sem categoria</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <FormField label="Frequência">
          <Select value={values.frequency} onChange={(e) => setValues((v) => ({ ...v, frequency: e.target.value as RecurrenceFrequency }))}>
            <option value="monthly">Mensal</option>
            <option value="weekly">Semanal</option>
            <option value="yearly">Anual</option>
          </Select>
        </FormField>

        <FormField label="Forma de pagamento">
          <Select value={values.payment_method} onChange={(e) => setValues((v) => ({ ...v, payment_method: e.target.value as PaymentMethod }))}>
            <option value="">Não informado</option>
            {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <FormField label="Primeira ocorrência">
          <TextInput type="date" required value={values.start_date} onChange={(e) => setValues((v) => ({ ...v, start_date: e.target.value }))} />
        </FormField>

        <FormField label="Termina em (opcional)">
          <TextInput type="date" value={values.end_date} onChange={(e) => setValues((v) => ({ ...v, end_date: e.target.value }))} />
        </FormField>
      </div>

      <label className="mb-1 flex items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" checked={values.active} onChange={(e) => setValues((v) => ({ ...v, active: e.target.checked }))} className="h-4 w-4 accent-cyan-400" />
        Ativo (gera lançamentos automaticamente)
      </label>

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={onCancel} className="w-full rounded-lg border border-cyan-500/20 px-4 py-2.5 font-medium text-slate-300 hover:bg-cyan-500/10">
          Cancelar
        </button>
        <PrimaryButton type="submit" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </PrimaryButton>
      </div>
    </form>
  )
}
