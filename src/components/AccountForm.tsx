import { useState } from 'react'
import { ErrorText, FormField, PrimaryButton, TextInput } from './FormField'
import type { PaymentAccount, PaymentAccountType } from '../types/database'

export interface AccountFormValues {
  name: string
  type: PaymentAccountType
  closing_day: string
  due_day: string
  monthly_credit: string
  credit_day: string
}

const ICON_BY_TYPE: Record<PaymentAccountType, string> = { cartao_credito: '💳', vale: '🍽️' }
const COLOR_BY_TYPE: Record<PaymentAccountType, string> = { cartao_credito: '#a78bfa', vale: '#22e0ff' }

function toValues(acc?: PaymentAccount | null): AccountFormValues {
  if (!acc) {
    return { name: '', type: 'cartao_credito', closing_day: '', due_day: '', monthly_credit: '', credit_day: '' }
  }
  return {
    name: acc.name,
    type: acc.type,
    closing_day: acc.closing_day != null ? String(acc.closing_day) : '',
    due_day: acc.due_day != null ? String(acc.due_day) : '',
    monthly_credit: acc.monthly_credit != null ? String(acc.monthly_credit) : '',
    credit_day: acc.credit_day != null ? String(acc.credit_day) : '',
  }
}

export function AccountForm({
  initial,
  onCancel,
  onSubmit,
}: {
  initial?: PaymentAccount | null
  onCancel: () => void
  onSubmit: (values: AccountFormValues) => Promise<{ error: string | null }>
}) {
  const [values, setValues] = useState<AccountFormValues>(toValues(initial))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!values.name.trim()) {
      setError('Informe um nome.')
      return
    }
    if (values.type === 'cartao_credito' && (!values.closing_day || !values.due_day)) {
      setError('Informe o dia de fechamento e o dia de vencimento.')
      return
    }
    if (values.type === 'vale' && (!values.monthly_credit || !values.credit_day)) {
      setError('Informe o valor do crédito mensal e o dia em que ele cai.')
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
          onClick={() => setValues((v) => ({ ...v, type: 'cartao_credito' }))}
          className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
            values.type === 'cartao_credito' ? 'border-cyan-400/60 bg-cyan-400/10 text-cyan-100' : 'border-cyan-500/20 text-slate-400'
          }`}
        >
          💳 Cartão de crédito
        </button>
        <button
          type="button"
          onClick={() => setValues((v) => ({ ...v, type: 'vale' }))}
          className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
            values.type === 'vale' ? 'border-cyan-400/60 bg-cyan-400/10 text-cyan-100' : 'border-cyan-500/20 text-slate-400'
          }`}
        >
          🍽️ Vale (VR/VA)
        </button>
      </div>

      <FormField label="Nome">
        <TextInput
          type="text"
          required
          autoFocus
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          placeholder={values.type === 'cartao_credito' ? 'Ex: Nubank, Inter...' : 'Ex: Alelo, VR, Ticket...'}
        />
      </FormField>

      {values.type === 'cartao_credito' ? (
        <div className="grid grid-cols-2 gap-2">
          <FormField label="Dia de fechamento">
            <TextInput
              type="number"
              inputMode="numeric"
              min="1"
              max="28"
              required
              value={values.closing_day}
              onChange={(e) => setValues((v) => ({ ...v, closing_day: e.target.value }))}
              placeholder="Ex: 5"
            />
          </FormField>
          <FormField label="Dia de vencimento">
            <TextInput
              type="number"
              inputMode="numeric"
              min="1"
              max="28"
              required
              value={values.due_day}
              onChange={(e) => setValues((v) => ({ ...v, due_day: e.target.value }))}
              placeholder="Ex: 15"
            />
          </FormField>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <FormField label="Crédito mensal (R$)">
            <TextInput
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              required
              value={values.monthly_credit}
              onChange={(e) => setValues((v) => ({ ...v, monthly_credit: e.target.value }))}
              placeholder="Ex: 1800"
            />
          </FormField>
          <FormField label="Dia do crédito">
            <TextInput
              type="number"
              inputMode="numeric"
              min="1"
              max="28"
              required
              value={values.credit_day}
              onChange={(e) => setValues((v) => ({ ...v, credit_day: e.target.value }))}
              placeholder="Ex: 5"
            />
          </FormField>
        </div>
      )}

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

export { ICON_BY_TYPE, COLOR_BY_TYPE }
