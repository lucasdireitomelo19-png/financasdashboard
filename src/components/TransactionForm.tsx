import { useState } from 'react'
import { ErrorText, FormField, PrimaryButton, Select, TextArea, TextInput } from './FormField'
import { PAYMENT_METHOD_LABELS } from '../lib/constants'
import { todayIso } from '../lib/format'
import type { Category, PaymentMethod, Transaction, TransactionType } from '../types/database'

export interface TransactionFormValues {
  type: TransactionType
  amount: string
  category_id: string
  description: string
  date: string
  payment_method: PaymentMethod | ''
  is_variable: boolean
  notes: string
}

function toValues(t?: Transaction | null): TransactionFormValues {
  if (!t) {
    return { type: 'expense', amount: '', category_id: '', description: '', date: todayIso(), payment_method: '', is_variable: false, notes: '' }
  }
  return {
    type: t.type,
    amount: String(t.amount),
    category_id: t.category_id ?? '',
    description: t.description,
    date: t.date,
    payment_method: t.payment_method ?? '',
    is_variable: t.is_variable,
    notes: t.notes ?? '',
  }
}

export function TransactionForm({
  initial,
  categories,
  onCancel,
  onSubmit,
}: {
  initial?: Transaction | null
  categories: Category[]
  onCancel: () => void
  onSubmit: (values: TransactionFormValues) => Promise<{ error: string | null }>
}) {
  const [values, setValues] = useState<TransactionFormValues>(toValues(initial))
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
          💸 Gasto
        </button>
        <button
          type="button"
          onClick={() => setValues((v) => ({ ...v, type: 'income', category_id: '' }))}
          className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
            values.type === 'income' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-cyan-500/20 text-slate-400'
          }`}
        >
          💰 Entrada
        </button>
      </div>

      <FormField label="Valor (R$)">
        <TextInput
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          required
          autoFocus
          value={values.amount}
          onChange={(e) => setValues((v) => ({ ...v, amount: e.target.value }))}
          placeholder="0,00"
        />
      </FormField>

      <FormField label="Descrição">
        <TextInput
          type="text"
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          placeholder="Ex: Supermercado, Uber, Netflix..."
        />
      </FormField>

      <div className="grid grid-cols-2 gap-2">
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

        <FormField label="Data">
          <TextInput type="date" required value={values.date} onChange={(e) => setValues((v) => ({ ...v, date: e.target.value }))} />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-2">
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

        <FormField label={values.type === 'income' ? 'Entrada variável?' : 'Gasto variável?'}>
          <label className="flex h-[42px] items-center gap-2 rounded-lg border border-cyan-500/20 bg-[#0a1120]/70 px-3">
            <input
              type="checkbox"
              checked={values.is_variable}
              onChange={(e) => setValues((v) => ({ ...v, is_variable: e.target.checked }))}
              className="h-4 w-4 accent-cyan-400"
            />
            <span className="text-sm text-slate-300">
              {values.type === 'income' ? 'Não é valor fixo' : 'Não planejado'}
            </span>
          </label>
        </FormField>
      </div>

      <FormField label="Observações (opcional)">
        <TextArea rows={2} value={values.notes} onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))} />
      </FormField>

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
