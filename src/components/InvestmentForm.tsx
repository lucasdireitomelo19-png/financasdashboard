import { useState } from 'react'
import { ErrorText, FormField, PrimaryButton, Select, TextArea, TextInput } from './FormField'
import { INVESTMENT_CATEGORY_LABELS } from '../lib/constants'
import { todayIso } from '../lib/format'
import type { Investment, InvestmentCategory } from '../types/database'

export interface InvestmentFormValues {
  name: string
  category: InvestmentCategory
  institution: string
  date_invested: string
  notes: string
  initialAmount: string
}

function toValues(inv?: Investment | null): InvestmentFormValues {
  if (!inv) {
    return { name: '', category: 'renda_fixa', institution: '', date_invested: todayIso(), notes: '', initialAmount: '' }
  }
  return { name: inv.name, category: inv.category, institution: inv.institution ?? '', date_invested: inv.date_invested, notes: inv.notes ?? '', initialAmount: '' }
}

export function InvestmentForm({
  initial,
  onCancel,
  onSubmit,
}: {
  initial?: Investment | null
  onCancel: () => void
  onSubmit: (values: InvestmentFormValues) => Promise<{ error: string | null }>
}) {
  const [values, setValues] = useState<InvestmentFormValues>(toValues(initial))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!values.name.trim()) {
      setError('Informe um nome para o investimento.')
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

      <FormField label="Nome">
        <TextInput
          type="text"
          required
          autoFocus
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          placeholder="Ex: Tesouro Selic 2029, PETR4, Fundo XP..."
        />
      </FormField>

      <div className="grid grid-cols-2 gap-2">
        <FormField label="Categoria">
          <Select value={values.category} onChange={(e) => setValues((v) => ({ ...v, category: e.target.value as InvestmentCategory }))}>
            {Object.entries(INVESTMENT_CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Instituição">
          <TextInput type="text" value={values.institution} onChange={(e) => setValues((v) => ({ ...v, institution: e.target.value }))} placeholder="Ex: XP, Nubank..." />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <FormField label="Data do investimento">
          <TextInput type="date" required value={values.date_invested} onChange={(e) => setValues((v) => ({ ...v, date_invested: e.target.value }))} />
        </FormField>

        {!initial && (
          <FormField label="Valor inicial aportado (opcional)">
            <TextInput
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={values.initialAmount}
              onChange={(e) => setValues((v) => ({ ...v, initialAmount: e.target.value }))}
              placeholder="0,00"
            />
          </FormField>
        )}
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
