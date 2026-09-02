import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useCategories } from '../hooks/useCategories'
import { useTransactions, type TransactionFilters } from '../hooks/useTransactions'
import { Modal } from '../components/Modal'
import { Select, TextInput } from '../components/FormField'
import { TransactionForm, type TransactionFormValues } from '../components/TransactionForm'
import { formatCurrency, currentMonthRange } from '../lib/format'
import { PAYMENT_METHOD_LABELS } from '../lib/constants'
import type { Transaction } from '../types/database'

const defaultRange = currentMonthRange()

export function Transactions() {
  const { user } = useAuth()
  const { categories } = useCategories(user?.id)
  const [filters, setFilters] = useState<TransactionFilters>({
    type: 'all',
    categoryId: 'all',
    paymentMethod: 'all',
    startDate: defaultRange.start,
    endDate: defaultRange.end,
    search: '',
    variableOnly: false,
  })
  const { transactions, loading, create, update, remove } = useTransactions(user?.id, filters)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  const totals = useMemo(() => {
    const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    return { income, expense, balance: income - expense }
  }, [transactions])

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of transactions) {
      if (!map.has(t.date)) map.set(t.date, [])
      map.get(t.date)!.push(t)
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [transactions])

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (t: Transaction) => {
    setEditing(t)
    setModalOpen(true)
  }

  const handleSubmit = async (values: TransactionFormValues) => {
    const payload = {
      type: values.type,
      amount: Number(values.amount),
      category_id: values.category_id || null,
      description: values.description,
      date: values.date,
      payment_method: values.payment_method || null,
      is_variable: values.is_variable,
      recurring_template_id: editing?.recurring_template_id ?? null,
      notes: values.notes || null,
    }
    const result = editing ? await update(editing.id, payload) : await create(payload)
    if (!result.error) setModalOpen(false)
    return result
  }

  const handleDelete = async (t: Transaction) => {
    if (!confirm(`Excluir "${t.description || 'este lançamento'}"?`)) return
    await remove(t.id)
  }

  const clearFilters = () =>
    setFilters({ type: 'all', categoryId: 'all', paymentMethod: 'all', startDate: '', endDate: '', search: '', variableOnly: false })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-100">Lançamentos</h1>
        <button onClick={openCreate} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
          + Novo
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Entradas" value={totals.income} color="text-emerald-400" />
        <MiniStat label="Saídas" value={totals.expense} color="text-red-400" />
        <MiniStat label="Saldo" value={totals.balance} color={totals.balance >= 0 ? 'text-emerald-400' : 'text-red-400'} />
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Select value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value as TransactionFilters['type'] }))}>
            <option value="all">Todos os tipos</option>
            <option value="expense">Gastos</option>
            <option value="income">Entradas</option>
          </Select>

          <Select value={filters.categoryId} onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value }))}>
            <option value="all">Todas categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </Select>

          <Select value={filters.paymentMethod} onChange={(e) => setFilters((f) => ({ ...f, paymentMethod: e.target.value }))}>
            <option value="all">Todas formas</option>
            {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>

          <TextInput type="date" value={filters.startDate} onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))} />
          <TextInput type="date" value={filters.endDate} onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))} />
          <TextInput type="text" placeholder="Buscar..." value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} />
        </div>

        <div className="mt-2 flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-slate-400">
            <input
              type="checkbox"
              checked={filters.variableOnly}
              onChange={(e) => setFilters((f) => ({ ...f, variableOnly: e.target.checked }))}
              className="h-4 w-4 accent-emerald-500"
            />
            Só variáveis/não planejados
          </label>
          <button onClick={clearFilters} className="text-xs text-slate-400 hover:text-emerald-400">
            Limpar filtros
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Carregando...</p>
        ) : grouped.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Nenhum lançamento encontrado com esses filtros.</p>
        ) : (
          <div className="space-y-5">
            {grouped.map(([date, items]) => (
              <div key={date}>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  {date.split('-').reverse().join('/')}
                </p>
                <ul className="divide-y divide-slate-800">
                  {items.map((t) => {
                    const cat = t.category_id ? categoryMap.get(t.category_id) : null
                    return (
                      <li key={t.id} className="flex items-center justify-between gap-2 py-2.5">
                        <button onClick={() => openEdit(t)} className="flex flex-1 items-center gap-3 text-left">
                          <span className="text-xl">{cat?.icon ?? '💸'}</span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-200">{t.description || cat?.name || 'Sem descrição'}</p>
                            <p className="truncate text-xs text-slate-500">
                              {cat?.name ?? 'Sem categoria'}
                              {t.payment_method ? ` · ${PAYMENT_METHOD_LABELS[t.payment_method]}` : ''}
                              {t.is_variable ? ' · variável' : ''}
                              {t.recurring_template_id ? ' · recorrente' : ''}
                            </p>
                          </div>
                        </button>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {t.type === 'income' ? '+' : '-'} {formatCurrency(Number(t.amount))}
                          </span>
                          <button onClick={() => handleDelete(t)} className="rounded p-1 text-slate-500 hover:text-red-400" aria-label="Excluir">
                            🗑️
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal title={editing ? 'Editar lançamento' : 'Novo lançamento'} onClose={() => setModalOpen(false)}>
          <TransactionForm initial={editing} categories={categories} onCancel={() => setModalOpen(false)} onSubmit={handleSubmit} />
        </Modal>
      )}
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 text-center">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold ${color}`}>{formatCurrency(value)}</p>
    </div>
  )
}
