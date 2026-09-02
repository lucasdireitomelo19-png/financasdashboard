import { useState } from 'react'
import { ErrorText, FormField, PrimaryButton, Select, TextInput } from './FormField'
import { INVESTMENT_MOVEMENT_LABELS } from '../lib/constants'
import { todayIso } from '../lib/format'
import type { InvestmentMovementType } from '../types/database'

export interface MovementFormValues {
  type: InvestmentMovementType
  amount: string
  date: string
  notes: string
}

export function MovementForm({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void
  onSubmit: (values: MovementFormValues) => Promise<{ error: string | null }>
}) {
  const [values, setValues] = useState<MovementFormValues>({ type: 'aporte', amount: '', date: todayIso(), notes: '' })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

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

      <FormField label="Tipo de movimentação">
        <Select value={values.type} onChange={(e) => setValues((v) => ({ ...v, type: e.target.value as InvestmentMovementType }))}>
          {Object.entries(INVESTMENT_MOVEMENT_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
      </FormField>

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

      <FormField label="Data">
        <TextInput type="date" required value={values.date} onChange={(e) => setValues((v) => ({ ...v, date: e.target.value }))} />
      </FormField>

      <p className="mb-3 text-xs text-slate-500">
        {values.type === 'aporte' && 'Adiciona ao valor investido e ao valor atual.'}
        {values.type === 'resgate' && 'Remove do valor investido e do valor atual.'}
        {values.type === 'rendimento' && 'Aumenta o valor atual sem contar como capital investido (ganho).'}
        {values.type === 'ajuste' && 'Ajusta o valor atual manualmente (ex: atualizar cotação), sem afetar o capital investido.'}
      </p>

      <div className="mt-2 flex gap-2">
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
