import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useCategories } from '../hooks/useCategories'
import { Modal } from '../components/Modal'
import { ErrorText, FormField, PrimaryButton, TextInput } from '../components/FormField'
import type { Category, TransactionType } from '../types/database'

const ICON_OPTIONS = ['💰', '🏠', '🛒', '🚗', '🍔', '💊', '📚', '🎮', '📺', '🛍️', '💡', '💇', '🐾', '✈️', '🧾', '📦', '💼', '💻', '🎁', '🏷️', '↩️', '📈', '⚡', '🎵', '☕']
const COLOR_OPTIONS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#06b6d4', '#d946ef', '#64748b']

export function Categories() {
  const { user } = useAuth()
  const { categories, create, update, remove } = useCategories(user?.id)
  const [tab, setTab] = useState<TransactionType>('expense')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)

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
        <h1 className="text-xl font-semibold text-slate-100">Categorias</h1>
        <button onClick={openCreate} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
          + Nova
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setTab('expense')}
          className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
            tab === 'expense' ? 'border-red-500 bg-red-500/10 text-red-400' : 'border-slate-700 text-slate-400'
          }`}
        >
          💸 Gastos
        </button>
        <button
          onClick={() => setTab('income')}
          className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
            tab === 'income' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-slate-700 text-slate-400'
          }`}
        >
          💰 Entradas
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {filtered.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-3">
            <button
              onClick={() => {
                setEditing(c)
                setModalOpen(true)
              }}
              className="flex flex-1 items-center gap-2 text-left"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full text-lg" style={{ background: `${c.color}22` }}>
                {c.icon}
              </span>
              <span className="truncate text-sm text-slate-200">{c.name}</span>
            </button>
            <button onClick={() => handleDelete(c)} className="rounded p-1 text-slate-500 hover:text-red-400" aria-label="Excluir">
              🗑️
            </button>
          </div>
        ))}
      </div>

      {modalOpen && (
        <Modal title={editing ? 'Editar categoria' : 'Nova categoria'} onClose={() => setModalOpen(false)}>
          <CategoryForm
            initial={editing}
            type={tab}
            onCancel={() => setModalOpen(false)}
            onSubmit={async (values) => {
              const result = editing ? await update(editing.id, values) : await create({ ...values, type: tab })
              if (!result.error) setModalOpen(false)
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
  onCancel,
  onSubmit,
}: {
  initial?: Category | null
  type: TransactionType
  onCancel: () => void
  onSubmit: (values: { name: string; color: string; icon: string }) => Promise<{ error: string | null }>
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? COLOR_OPTIONS[0])
  const [icon, setIcon] = useState(initial?.icon ?? ICON_OPTIONS[0])
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
    const result = await onSubmit({ name: name.trim(), color, icon })
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
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg ${icon === opt ? 'bg-emerald-600/30 ring-1 ring-emerald-500' : 'bg-slate-800'}`}
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
              className={`h-8 w-8 rounded-full ${color === opt ? 'ring-2 ring-offset-2 ring-offset-slate-900 ring-emerald-500' : ''}`}
              style={{ background: opt }}
            />
          ))}
        </div>
      </FormField>

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={onCancel} className="w-full rounded-lg border border-slate-700 px-4 py-2.5 font-medium text-slate-300 hover:bg-slate-800">
          Cancelar
        </button>
        <PrimaryButton type="submit" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </PrimaryButton>
      </div>
    </form>
  )
}
