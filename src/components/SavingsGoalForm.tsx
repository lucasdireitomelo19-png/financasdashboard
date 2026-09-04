import { useState } from 'react'
import { ErrorText, FormField, PrimaryButton, Select, TextInput } from './FormField'
import type { SavingsGoal } from '../types/database'

const ICON_OPTIONS = ['🎯', '✈️', '🏠', '🚗', '💍', '🎓', '🏝️', '💻', '🛡️', '🎁']
const COLOR_OPTIONS = ['#22e0ff', '#ffb020', '#2dffb0', '#a78bfa', '#ff4d6a', '#fbbf24']

export interface SavingsGoalFormValues {
  name: string
  target_amount: string
  target_date: string
  icon: string
  color: string
  linked_investment_id: string
}

function toValues(g?: SavingsGoal | null): SavingsGoalFormValues {
  if (!g) return { name: '', target_amount: '', target_date: '', icon: ICON_OPTIONS[0], color: COLOR_OPTIONS[0], linked_investment_id: '' }
  return {
    name: g.name,
    target_amount: String(g.target_amount),
    target_date: g.target_date ?? '',
    icon: g.icon,
    color: g.color,
    linked_investment_id: g.linked_investment_id ?? '',
  }
}

export function SavingsGoalForm({
  initial,
  investments,
  onCancel,
  onSubmit,
}: {
  initial?: SavingsGoal | null
  investments: { id: string; name: string }[]
  onCancel: () => void
  onSubmit: (values: SavingsGoalFormValues) => Promise<{ error: string | null }>
}) {
  const [values, setValues] = useState<SavingsGoalFormValues>(toValues(initial))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!values.name.trim()) {
      setError('Informe um nome para a meta.')
      return
    }
    if (!values.target_amount || Number(values.target_amount) <= 0) {
      setError('Informe um valor-alvo válido.')
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

      <FormField label="Nome da meta">
        <TextInput type="text" required autoFocus value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} placeholder="Ex: Viagem, Reserva do carro..." />
      </FormField>

      <div className="grid grid-cols-2 gap-2">
        <FormField label="Valor-alvo (R$)">
          <TextInput
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            required
            value={values.target_amount}
            onChange={(e) => setValues((v) => ({ ...v, target_amount: e.target.value }))}
            placeholder="Ex: 5000"
          />
        </FormField>
        <FormField label="Data-alvo (opcional)">
          <TextInput type="date" value={values.target_date} onChange={(e) => setValues((v) => ({ ...v, target_date: e.target.value }))} />
        </FormField>
      </div>

      {investments.length > 0 && (
        <FormField label="Vincular a um investimento (opcional)">
          <Select value={values.linked_investment_id} onChange={(e) => setValues((v) => ({ ...v, linked_investment_id: e.target.value }))}>
            <option value="">Não vincular — registrar aportes manualmente</option>
            {investments.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.name}
              </option>
            ))}
          </Select>
          {values.linked_investment_id && (
            <p className="mt-1 text-xs text-slate-500">O valor guardado dessa meta passa a acompanhar automaticamente o valor atual desse investimento.</p>
          )}
        </FormField>
      )}

      <FormField label="Ícone">
        <div className="flex flex-wrap gap-2">
          {ICON_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setValues((v) => ({ ...v, icon: opt }))}
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg ${values.icon === opt ? 'bg-cyan-500/25 ring-1 ring-cyan-400' : 'bg-[#0a1120]/70'}`}
            >
              {opt}
            </button>
          ))}
        </div>
      </FormField>

      <FormField label="Cor">
        <div className="flex flex-wrap gap-2">
          {COLOR_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setValues((v) => ({ ...v, color: opt }))}
              className={`h-8 w-8 rounded-full ${values.color === opt ? 'ring-2 ring-offset-2 ring-offset-[#050810] ring-cyan-400' : ''}`}
              style={{ background: opt }}
            />
          ))}
        </div>
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
