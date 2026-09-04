import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useCategories } from '../hooks/useCategories'
import { usePaymentAccounts } from '../hooks/usePaymentAccounts'
import { useRecurringTemplates } from '../hooks/useRecurringTemplates'
import { Modal } from '../components/Modal'
import { RecurringForm, type RecurringFormValues } from '../components/RecurringForm'
import { formatCurrency, formatDate, todayIso } from '../lib/format'
import { nextOccurrenceAfter } from '../lib/recurrence'
import { triggerSaveFeedback } from '../lib/feedback'
import { AnimatedNumber } from '../components/AnimatedNumber'
import type { RecurringTemplate } from '../types/database'

const FREQ_LABELS: Record<string, string> = { weekly: 'Semanal', monthly: 'Mensal', yearly: 'Anual' }

export function Recurring() {
  const { user } = useAuth()
  const { categories } = useCategories(user?.id)
  const { accounts } = usePaymentAccounts(user?.id)
  const { templates, create, update, remove } = useRecurringTemplates(user?.id)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<RecurringTemplate | null>(null)

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const today = todayIso()

  const fixedExpenses = templates.filter((t) => t.type === 'expense' && !t.is_company)
  const companyExpenses = templates.filter((t) => t.type === 'expense' && t.is_company)
  const fixedIncomes = templates.filter((t) => t.type === 'income')

  const monthlyAmount = (t: RecurringTemplate) => Number(t.amount) * (t.frequency === 'monthly' ? 1 : t.frequency === 'weekly' ? 4.33 : 1 / 12)

  const monthlyExpenseTotal = fixedExpenses.filter((t) => t.active).reduce((s, t) => s + monthlyAmount(t), 0)
  const monthlyIncomeTotal = fixedIncomes.filter((t) => t.active).reduce((s, t) => s + monthlyAmount(t), 0)
  const monthlyCompanyTotal = companyExpenses.filter((t) => t.active).reduce((s, t) => s + monthlyAmount(t), 0)

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (t: RecurringTemplate) => {
    setEditing(t)
    setModalOpen(true)
  }

  const handleSubmit = async (values: RecurringFormValues) => {
    const payload = {
      type: values.type,
      amount: Number(values.amount),
      category_id: values.category_id || null,
      description: values.description,
      frequency: values.frequency,
      day_of_month: null,
      day_of_week: null,
      start_date: values.start_date,
      end_date: values.end_date || null,
      payment_method: values.payment_method || null,
      account_id: values.account_id || null,
      active: values.active,
      is_company: values.is_company,
    }
    const result = editing ? await update(editing.id, payload) : await create(payload)
    if (!result.error) {
      setModalOpen(false)
      triggerSaveFeedback()
    }
    return result
  }

  const handleDelete = async (t: RecurringTemplate) => {
    if (!confirm(`Excluir a recorrência "${t.description}"? Os lançamentos já gerados não serão apagados.`)) return
    await remove(t.id)
  }

  const toggleActive = async (t: RecurringTemplate) => {
    await update(t.id, { active: !t.active })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-lg font-bold uppercase tracking-wider text-cyan-100">Recorrentes</h1>
        <button onClick={openCreate} className="rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-400 px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-[#031018] shadow-[0_0_20px_-4px_color-mix(in_srgb,var(--color-accent)_80%,transparent)] transition hover:from-cyan-400 hover:to-cyan-300">
          + Novo
        </button>
      </div>
      <p className="text-sm text-slate-400">
        Gastos e entradas de valor fixo (aluguel, salário, assinaturas). O app lança automaticamente na data certa.
      </p>

      <div className="grid grid-cols-3 gap-3">
        <div className="panel-calm h-full p-3 text-center">
          <p className="font-display text-[10px] uppercase tracking-wider text-slate-500">Entradas fixas / mês (aprox.)</p>
          <p className="mt-0.5 font-display text-sm font-bold text-emerald-400">
            <AnimatedNumber value={monthlyIncomeTotal} format={formatCurrency} />
          </p>
        </div>
        <div className="panel-calm h-full p-3 text-center">
          <p className="font-display text-[10px] uppercase tracking-wider text-slate-500">Gastos fixos / mês (aprox.)</p>
          <p className="mt-0.5 font-display text-sm font-bold text-rose-400">
            <AnimatedNumber value={monthlyExpenseTotal} format={formatCurrency} />
          </p>
        </div>
        <div className="panel-calm h-full p-3 text-center">
          <p className="font-display text-[10px] uppercase tracking-wider text-slate-500">Empresa / mês (aprox.)</p>
          <p className="mt-0.5 font-display text-sm font-bold text-amber-400">
            <AnimatedNumber value={monthlyCompanyTotal} format={formatCurrency} />
          </p>
        </div>
      </div>

      <TemplateSection title="Entradas recorrentes" items={fixedIncomes} categoryMap={categoryMap} today={today} onEdit={openEdit} onDelete={handleDelete} onToggle={toggleActive} />
      <TemplateSection title="Gastos recorrentes" items={fixedExpenses} categoryMap={categoryMap} today={today} onEdit={openEdit} onDelete={handleDelete} onToggle={toggleActive} />
      <TemplateSection title="🏢 Gastos da empresa" items={companyExpenses} categoryMap={categoryMap} today={today} onEdit={openEdit} onDelete={handleDelete} onToggle={toggleActive} />

      {modalOpen && (
        <Modal title={editing ? 'Editar recorrência' : 'Nova recorrência'} onClose={() => setModalOpen(false)}>
          <RecurringForm initial={editing} categories={categories} accounts={accounts.filter((a) => !a.archived)} onCancel={() => setModalOpen(false)} onSubmit={handleSubmit} />
        </Modal>
      )}
    </div>
  )
}

function TemplateSection({
  title,
  items,
  categoryMap,
  today,
  onEdit,
  onDelete,
  onToggle,
}: {
  title: string
  items: RecurringTemplate[]
  categoryMap: Map<string, { name: string; icon: string }>
  today: string
  onEdit: (t: RecurringTemplate) => void
  onDelete: (t: RecurringTemplate) => void
  onToggle: (t: RecurringTemplate) => void
}) {
  return (
    <div className="panel-calm p-4">
      <h2 className="mb-3 font-display text-xs font-semibold uppercase tracking-wider text-cyan-300/70">{title}</h2>
      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-500">Nenhuma recorrência cadastrada.</p>
      ) : (
        <ul className="divide-y divide-cyan-500/10">
          {items.map((t) => {
            const cat = t.category_id ? categoryMap.get(t.category_id) : null
            const next = t.active ? nextOccurrenceAfter(t, today) : null
            return (
              <li key={t.id} className="flex items-center justify-between gap-2 py-2.5">
                <button onClick={() => onEdit(t)} className="flex flex-1 items-center gap-3 text-left">
                  <span className="text-xl">{cat?.icon ?? '🔁'}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-200">{t.description}</p>
                    <p className="truncate text-xs text-slate-500">
                      {FREQ_LABELS[t.frequency]} · {t.active ? (next ? `próxima: ${formatDate(next)}` : 'encerrada') : 'pausada'}
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(Number(t.amount))}</span>
                  <button
                    onClick={() => onToggle(t)}
                    className={`rounded p-1 text-xs ${t.active ? 'text-emerald-400' : 'text-slate-500'}`}
                    title={t.active ? 'Pausar' : 'Ativar'}
                  >
                    {t.active ? '⏸️' : '▶️'}
                  </button>
                  <button onClick={() => onDelete(t)} className="rounded p-1 text-slate-500 hover:text-rose-400" aria-label="Excluir">
                    🗑️
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
