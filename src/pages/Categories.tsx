import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useCategories } from '../hooks/useCategories'
import { useCategoryBudgets } from '../hooks/useCategoryBudgets'
import { supabase } from '../lib/supabase'
import { Modal } from '../components/Modal'
import { ErrorText, FormField, PrimaryButton, TextInput } from '../components/FormField'
import { formatCurrency, currentMonthRange } from '../lib/format'
import { triggerSaveFeedback } from '../lib/feedback'
import type { Category, TransactionType } from '../types/database'

const ICON_OPTIONS = ['💰', '🏠', '🛒', '🚗', '🍔', '💊', '📚', '🎮', '📺', '🛍️', '💡', '💇', '🐾', '✈️', '🧾', '📦', '💼', '💻', '🎁', '🏷️', '↩️', '📈', '⚡', '🎵', '☕']
const COLOR_OPTIONS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#06b6d4', '#d946ef', '#64748b']

export function Categories() {
  const { user } = useAuth()
  const { categories, create, update, remove } = useCategories(user?.id)
  const { budgetFor, setBudget, removeBudget } = useCategoryBudgets(user?.id)
  const [tab, setTab] = useState<TransactionType>('expense')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [spentByCategory, setSpentByCategory] = useState<Map<string, number>>(new Map())
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    const { start, end } = currentMonthRange()
    supabase
      .from('transactions')
      .select('category_id, amount')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('date', start)
      .lte('date', end)
      .then(({ data }) => {
        const map = new Map<string, number>()
        for (const row of data ?? []) {
          if (!row.category_id) continue
          map.set(row.category_id, (map.get(row.category_id) ?? 0) + Number(row.amount))
        }
        setSpentByCategory(map)
      })
  }, [user])

  const filtered = categories.filter((c) => c.type === tab)

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const handleDelete = async (c: Category) => {
    if (!confirm(`Excluir a categoria "${c.name}"? Lançamentos existentes ficarão sem categoria.`)) return
    await remove(c.id)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-lg font-bold uppercase tracking-wider text-cyan-100">Categorias</h1>
        <button onClick={openCreate} className="rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-400 px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-[#031018] shadow-[0_0_20px_-4px_color-mix(in_srgb,var(--color-accent)_80%,transparent)] transition hover:from-cyan-400 hover:to-cyan-300">
          + Nova
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setTab('expense')}
          className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
            tab === 'expense' ? 'border-rose-500 bg-rose-500/10 text-rose-400' : 'border-cyan-500/20 text-slate-400'
          }`}
        >
          💸 Gastos
        </button>
        <button
          onClick={() => setTab('income')}
          className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
            tab === 'income' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-cyan-500/20 text-slate-400'
          }`}
        >
          💰 Entradas
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {filtered.map((c) => {
          const budget = tab === 'expense' ? budgetFor(c.id) : null
          const spent = spentByCategory.get(c.id) ?? 0
          const pct = budget ? Math.min(100, (spent / budget.monthly_limit) * 100) : 0
          return (
            <div key={c.id} className="panel-calm relative p-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    setEditing(c)
                    setModalOpen(true)
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full text-lg" style={{ background: `${c.color}22` }}>
                    {c.icon}
                  </span>
                  <span className="truncate text-sm text-slate-200">{c.name}</span>
                </button>
                <button
                  onClick={() => setOpenMenu(openMenu === c.id ? null : c.id)}
                  className="rounded p-1.5 text-lg leading-none text-slate-500 hover:text-cyan-300"
                  aria-label="Mais opções"
                  aria-expanded={openMenu === c.id}
                >
                  ⋮
                </button>
              </div>

              {openMenu === c.id && (
                <>
                  <button className="fixed inset-0 z-40 cursor-default" onClick={() => setOpenMenu(null)} aria-label="Fechar menu" />
                  <div className="hud-panel absolute right-3 top-11 z-50 w-36 overflow-hidden !p-0">
                    <button
                      onClick={() => {
                        setOpenMenu(null)
                        setEditing(c)
                        setModalOpen(true)
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-200 hover:bg-cyan-500/10"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => {
                        setOpenMenu(null)
                        void handleDelete(c)
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-rose-400 hover:bg-rose-500/10"
                    >
                      🗑️ Excluir
                    </button>
                  </div>
                </>
              )}

              {budget && (
                <div className="mt-2">
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#0a1120]">
                    <div
                      className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-400' : 'bg-cyan-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className={`mt-1 text-[10px] ${pct >= 100 ? 'text-rose-400' : 'text-slate-500'}`}>
                    {formatCurrency(spent)} de {formatCurrency(budget.monthly_limit)}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {modalOpen && (
        <Modal title={editing ? 'Editar categoria' : 'Nova categoria'} onClose={() => setModalOpen(false)}>
          <CategoryForm
            initial={editing}
            type={tab}
            currentBudget={editing ? budgetFor(editing.id) : null}
            onCancel={() => setModalOpen(false)}
            onSubmit={async (values) => {
              const result = editing ? await update(editing.id, values) : await create({ ...values, type: tab })
              if (result.error) return result

              const categoryId = editing?.id
              if (tab === 'expense' && categoryId) {
                if (values.budget && Number(values.budget) > 0) await setBudget(categoryId, Number(values.budget))
                else await removeBudget(categoryId)
              }

              setModalOpen(false)
              triggerSaveFeedback()
              return result
            }}
          />
        </Modal>
      )}
    </div>
  )
}

function CategoryForm({
  initial,
  type,
  currentBudget,
  onCancel,
  onSubmit,
}: {
  initial?: Category | null
  type: TransactionType
  currentBudget: { monthly_limit: number } | null
  onCancel: () => void
  onSubmit: (values: { name: string; color: string; icon: string; budget: string }) => Promise<{ error: string | null }>
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? COLOR_OPTIONS[0])
  const [icon, setIcon] = useState(initial?.icon ?? ICON_OPTIONS[0])
  const [budget, setBudgetValue] = useState(currentBudget ? String(currentBudget.monthly_limit) : '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Informe um nome.')
      return
    }
    setSaving(true)
    const result = await onSubmit({ name: name.trim(), color, icon, budget })
    setSaving(false)
    if (result.error) setError(result.error)
  }

  return (
    <form onSubmit={handleSubmit}>
      <ErrorText>{error}</ErrorText>

      <FormField label="Nome">
        <TextInput type="text" required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={type === 'expense' ? 'Ex: Farmácia' : 'Ex: Renda extra'} />
      </FormField>

      <FormField label="Ícone">
        <div className="flex flex-wrap gap-2">
          {ICON_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setIcon(opt)}
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg ${icon === opt ? 'bg-cyan-500/25 ring-1 ring-cyan-400' : 'bg-[#0a1120]/70'}`}
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
              onClick={() => setColor(opt)}
              className={`h-8 w-8 rounded-full ${color === opt ? 'ring-2 ring-offset-2 ring-offset-[#050810] ring-cyan-400' : ''}`}
              style={{ background: opt }}
            />
          ))}
        </div>
      </FormField>

      {type === 'expense' && initial && (
        <FormField label="Orçamento mensal (opcional)">
          <TextInput
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={budget}
            onChange={(e) => setBudgetValue(e.target.value)}
            placeholder="Ex: 600 — deixe em branco pra não limitar"
          />
        </FormField>
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
