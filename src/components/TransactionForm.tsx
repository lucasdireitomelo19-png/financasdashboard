import { useState } from 'react'
import { ErrorText, FormField, PrimaryButton, Select, TextArea, TextInput } from './FormField'
import { PAYMENT_METHOD_LABELS } from '../lib/constants'
import { todayIso } from '../lib/format'
import type { Category, PaymentAccount, PaymentMethod, Transaction, TransactionType } from '../types/database'

export interface TransactionFormValues {
  type: TransactionType
  amount: string
  category_id: string
  description: string
  date: string
  payment_method: PaymentMethod | ''
  is_variable: boolean
  account_id: string
  is_installment: boolean
  installments: string
  notes: string
}

function toValues(t?: Transaction | null): TransactionFormValues {
  if (!t) {
    return {
      type: 'expense',
      amount: '',
      category_id: '',
      description: '',
      date: todayIso(),
      payment_method: '',
      is_variable: false,
      account_id: '',
      is_installment: false,
      installments: '2',
      notes: '',
    }
  }
  return {
    type: t.type,
    amount: String(t.amount),
    category_id: t.category_id ?? '',
    description: t.description,
    date: t.date,
    payment_method: t.payment_method ?? '',
    is_variable: t.is_variable,
    account_id: t.account_id ?? '',
    is_installment: false,
    installments: '2',
    notes: t.notes ?? '',
  }
}

export function TransactionForm({
  initial,
  categories,
  accounts,
  onCancel,
  onSubmit,
}: {
  initial?: Transaction | null
  categories: Category[]
  accounts: PaymentAccount[]
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
    if (values.is_installment && (!values.installments || Number(values.installments) < 2 || Number(values.installments) > 60)) {
      setError('Informe um número de parcelas entre 2 e 60.')
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

      <FormField label={values.is_installment ? 'Valor total da compra (R$)' : 'Valor (R$)'}>
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

      {!initial && values.type === 'expense' && (
        <div className="mb-3 rounded-lg border border-cyan-500/20 bg-[#0a1120]/60 p-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={values.is_installment}
              onChange={(e) => setValues((v) => ({ ...v, is_installment: e.target.checked }))}
              className="h-4 w-4 accent-cyan-400"
            />
            <span className="text-sm text-slate-300">Compra parcelada?</span>
          </label>

          {values.is_installment && (
            <div className="mt-3">
              <FormField label="Número de parcelas">
                <TextInput
                  type="number"
                  inputMode="numeric"
                  min="2"
                  max="60"
                  value={values.installments}
                  onChange={(e) => setValues((v) => ({ ...v, installments: e.target.value }))}
                />
              </FormField>
              {Number(values.amount) > 0 && Number(values.installments) >= 2 && (
                <p className="text-xs text-slate-500">
                  {values.installments}x de{' '}
                  <span className="font-medium text-cyan-300">
                    {(Number(values.amount) / Number(values.installments)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>{' '}
                  — a primeira parcela entra na data escolhida abaixo, as próximas nos meses seguintes.
                </p>
              )}
            </div>
          )}
        </div>
      )}

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

      {values.type === 'expense' && accounts.length > 0 && (
        <FormField label="Conta (opcional)">
          <Select value={values.account_id} onChange={(e) => setValues((v) => ({ ...v, account_id: e.target.value }))}>
            <option value="">Nenhuma</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.icon} {a.name}
              </option>
            ))}
          </Select>
        </FormField>
      )}

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
