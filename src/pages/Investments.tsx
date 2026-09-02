import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { useInvestments, type InvestmentWithTotals } from '../hooks/useInvestments'
import { Modal } from '../components/Modal'
import { InvestmentForm, type InvestmentFormValues } from '../components/InvestmentForm'
import { MovementForm, type MovementFormValues } from '../components/MovementForm'
import { formatCurrency, formatDate } from '../lib/format'
import { INVESTMENT_CATEGORY_COLORS, INVESTMENT_CATEGORY_LABELS, INVESTMENT_MOVEMENT_LABELS } from '../lib/constants'
import type { Investment } from '../types/database'

export function Investments() {
  const { user } = useAuth()
  const { investments, movementsFor, create, update, remove, addMovement, removeMovement } = useInvestments(user?.id)

  const [formModal, setFormModal] = useState<'closed' | 'create' | 'edit'>('closed')
  const [editing, setEditing] = useState<Investment | null>(null)
  const [movementTarget, setMovementTarget] = useState<InvestmentWithTotals | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const totals = useMemo(() => {
    const invested = investments.reduce((s, i) => s + i.invested, 0)
    const current = investments.reduce((s, i) => s + i.currentValue, 0)
    const gain = current - invested
    return { invested, current, gain, gainPct: invested > 0 ? (gain / invested) * 100 : 0 }
  }, [investments])

  const allocation = useMemo(() => {
    const map = new Map<string, number>()
    for (const inv of investments) {
      if (inv.currentValue <= 0) continue
      map.set(inv.category, (map.get(inv.category) ?? 0) + inv.currentValue)
    }
    return Array.from(map.entries()).map(([category, value]) => ({
      name: INVESTMENT_CATEGORY_LABELS[category as keyof typeof INVESTMENT_CATEGORY_LABELS],
      value,
      color: INVESTMENT_CATEGORY_COLORS[category as keyof typeof INVESTMENT_CATEGORY_COLORS],
    }))
  }, [investments])

  const openCreate = () => {
    setEditing(null)
    setFormModal('create')
  }

  const openEdit = (inv: Investment) => {
    setEditing(inv)
    setFormModal('edit')
  }

  const handleSubmit = async (values: InvestmentFormValues) => {
    if (editing) {
      const result = await update(editing.id, {
        name: values.name,
        category: values.category,
        institution: values.institution || null,
        date_invested: values.date_invested,
        notes: values.notes || null,
      })
      if (!result.error) setFormModal('closed')
      return result
    }

    const result = await create({
      name: values.name,
      category: values.category,
      institution: values.institution || null,
      date_invested: values.date_invested,
      notes: values.notes || null,
      archived: false,
    })
    if (result.error) return result

    if (result.id && values.initialAmount && Number(values.initialAmount) > 0) {
      await addMovement({ investment_id: result.id, type: 'aporte', amount: Number(values.initialAmount), date: values.date_invested, notes: null })
    }
    setFormModal('closed')
    return { error: null }
  }

  const handleDelete = async (inv: Investment) => {
    if (!confirm(`Excluir "${inv.name}" e todo o histórico de movimentações?`)) return
    await remove(inv.id)
  }

  const handleMovementSubmit = async (values: MovementFormValues) => {
    if (!movementTarget) return { error: 'Selecione um investimento' }
    const result = await addMovement({
      investment_id: movementTarget.id,
      type: values.type,
      amount: Number(values.amount),
      date: values.date,
      notes: values.notes || null,
    })
    if (!result.error) setMovementTarget(null)
    return result
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-100">Investimentos</h1>
        <button onClick={openCreate} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
          + Novo
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Investido" value={totals.invested} color="text-slate-200" />
        <MiniStat label="Patrimônio atual" value={totals.current} color="text-sky-400" />
        <MiniStat
          label="Ganho"
          value={totals.gain}
          color={totals.gain >= 0 ? 'text-emerald-400' : 'text-red-400'}
          suffix={totals.invested > 0 ? ` (${totals.gainPct >= 0 ? '+' : ''}${totals.gainPct.toFixed(1)}%)` : ''}
        />
      </div>

      {allocation.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-3 text-sm font-medium text-slate-300">Alocação da carteira</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={allocation} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                {allocation.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0' }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="space-y-3">
        {investments.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-500">
            Nenhum investimento cadastrado ainda. Adicione o primeiro para começar a acompanhar sua carteira.
          </div>
        ) : (
          investments.map((inv) => {
            const isOpen = expanded === inv.id
            const movements = movementsFor(inv.id)
            return (
              <div key={inv.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => setExpanded(isOpen ? null : inv.id)} className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: INVESTMENT_CATEGORY_COLORS[inv.category] }} />
                      <p className="text-sm font-semibold text-slate-100">{inv.name}</p>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {INVESTMENT_CATEGORY_LABELS[inv.category]}
                      {inv.institution ? ` · ${inv.institution}` : ''} · desde {formatDate(inv.date_invested)}
                    </p>
                  </button>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-100">{formatCurrency(inv.currentValue)}</p>
                    <p className={`text-xs ${inv.gain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {inv.gain >= 0 ? '+' : ''}
                      {formatCurrency(inv.gain)} ({inv.gainPct >= 0 ? '+' : ''}
                      {inv.gainPct.toFixed(1)}%)
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => setMovementTarget(inv)} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800">
                    + Movimentação
                  </button>
                  <button onClick={() => openEdit(inv)} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800">
                    Editar
                  </button>
                  <button onClick={() => handleDelete(inv)} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10">
                    Excluir
                  </button>
                  <button onClick={() => setExpanded(isOpen ? null : inv.id)} className="ml-auto text-xs text-slate-500 hover:text-emerald-400">
                    {isOpen ? 'Ocultar histórico ▲' : `Histórico (${movements.length}) ▼`}
                  </button>
                </div>

                {isOpen && (
                  <ul className="mt-3 space-y-1.5 border-t border-slate-800 pt-3">
                    {movements.length === 0 ? (
                      <p className="text-xs text-slate-500">Nenhuma movimentação registrada.</p>
                    ) : (
                      movements.map((m) => (
                        <li key={m.id} className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">
                            {INVESTMENT_MOVEMENT_LABELS[m.type]} · {formatDate(m.date)}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="font-medium text-slate-300">{formatCurrency(Number(m.amount))}</span>
                            <button onClick={() => removeMovement(m.id)} className="text-slate-500 hover:text-red-400">
                              🗑️
                            </button>
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            )
          })
        )}
      </div>

      {formModal !== 'closed' && (
        <Modal title={editing ? 'Editar investimento' : 'Novo investimento'} onClose={() => setFormModal('closed')}>
          <InvestmentForm initial={editing} onCancel={() => setFormModal('closed')} onSubmit={handleSubmit} />
        </Modal>
      )}

      {movementTarget && (
        <Modal title={`Movimentação — ${movementTarget.name}`} onClose={() => setMovementTarget(null)}>
          <MovementForm onCancel={() => setMovementTarget(null)} onSubmit={handleMovementSubmit} />
        </Modal>
      )}
    </div>
  )
}

function MiniStat({ label, value, color, suffix }: { label: string; value: number; color: string; suffix?: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 text-center">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold ${color}`}>
        {formatCurrency(value)}
        {suffix}
      </p>
    </div>
  )
}
