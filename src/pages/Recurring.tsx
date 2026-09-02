import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useCategories } from '../hooks/useCategories'
import { useRecurringTemplates } from '../hooks/useRecurringTemplates'
import { Modal } from '../components/Modal'
import { RecurringForm, type RecurringFormValues } from '../components/RecurringForm'
import { formatCurrency, formatDate, todayIso } from '../lib/format'
import { nextOccurrenceAfter } from '../lib/recurrence'
import type { RecurringTemplate } from '../types/database'

const FREQ_LABELS: Record<string, string> = { weekly: 'Semanal', monthly: 'Mensal', yearly: 'Anual' }

export function Recurring() {
  const { user } = useAuth()
  const { categories } = useCategories(user?.id)
  const { templates, create, update, remove } = useRecurringTemplates(user?.id)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<RecurringTemplate | null>(null)

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const today = todayIso()

  const fixedExpenses = templates.filter((t) => t.type === 'expense')
  const fixedIncomes = templates.filter((t) => t.type === 'income')

  const monthlyExpenseTotal = fixedExpenses
    .filter((t) => t.active)
    .reduce((s, t) => s + Number(t.amount) * (t.frequency === 'monthly' ? 1 : t.frequency === 'weekly' ? 4.33 : 1 / 12), 0)
  const monthlyIncomeTotal = fixedIncomes
    .filter((t) => t.active)
    .reduce((s, t) => s + Number(t.amount) * (t.frequency === 'monthly' ? 1 : t.frequency === 'weekly' ? 4.33 : 1 / 12), 0)

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
      active: values.active,
    }
    const result = editing ? await update(editing.id, payload) : await create(payload)
    if (!result.error) setModalOpen(false)
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
        <h1 className="text-xl font-semibold text-slate-100">Recorrentes</h1>
        <button onClick={openCreate} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
          + Novo
        </button>
      </div>
      <p className="text-sm text-slate-400">
        Gastos e entradas de valor fixo (aluguel, salário, assinaturas). O app lança automaticamente na data certa.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 text-center">
          <p className="text-xs text-slate-400">Entradas fixas / mês (aprox.)</p>
          <p className="mt-0.5 text-sm font-semibold text-emerald-400">{formatCurrency(monthlyIncomeTotal)}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 text-center">
          <p className="text-xs text-slate-400">Gastos fixos / mês (aprox.)</p>
          <p className="mt-0.5 text-sm font-semibold text-red-400">{formatCurrency(monthlyExpenseTotal)}</p>
        </div>
      </div>

      <TemplateSection title="Entradas recorrentes" items={fixedIncomes} categoryMap={categoryMap} today={today} onEdit={openEdit} onDelete={handleDelete} onToggle={toggleActive} />
      <TemplateSection title="Gastos recorrentes" items={fixedExpenses} categoryMap={categoryMap} today={today} onEdit={openEdit} onDelete={handleDelete} onToggle={toggleActive} />

      {modalOpen && (
        <Modal title={editing ? 'Editar recorrência' : 'Nova recorrência'} onClose={() => setModalOpen(false)}>
          <RecurringForm initial={editing} categories={categories} onCancel={() => setModalOpen(false)} onSubmit={handleSubmit} />
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
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <h2 className="mb-3 text-sm font-medium text-slate-300">{title}</h2>
      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-500">Nenhuma recorrência cadastrada.</p>
      ) : (
        <ul className="divide-y divide-slate-800">
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
                  <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(Number(t.amount))}</span>
                  <button
                    onClick={() => onToggle(t)}
                    className={`rounded p-1 text-xs ${t.active ? 'text-emerald-400' : 'text-slate-500'}`}
                    title={t.active ? 'Pausar' : 'Ativar'}
                  >
                    {t.active ? '⏸️' : '▶️'}
                  </button>
                  <button onClick={() => onDelete(t)} className="rounded p-1 text-slate-500 hover:text-red-400" aria-label="Excluir">
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
