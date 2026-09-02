import { useState } from 'react'
import { ErrorText, FormField, PrimaryButton, Select, TextInput } from './FormField'
import { todayIso } from '../lib/format'

export interface ContributionFormValues {
  direction: 'aporte' | 'retirada'
  amount: string
  date: string
}

export function GoalContributionForm({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void
  onSubmit: (values: ContributionFormValues) => Promise<{ error: string | null }>
}) {
  const [values, setValues] = useState<ContributionFormValues>({ direction: 'aporte', amount: '', date: todayIso() })
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

      <FormField label="Tipo">
        <Select value={values.direction} onChange={(e) => setValues((v) => ({ ...v, direction: e.target.value as 'aporte' | 'retirada' }))}>
          <option value="aporte">Guardar dinheiro (aporte)</option>
          <option value="retirada">Retirar dinheiro</option>
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

      <div className="mb-1">
        <FormField label="Data">
          <TextInput type="date" required value={values.date} onChange={(e) => setValues((v) => ({ ...v, date: e.target.value }))} />
        </FormField>
      </div>

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
