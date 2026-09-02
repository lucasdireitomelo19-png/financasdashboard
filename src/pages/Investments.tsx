import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { useInvestments, type InvestmentWithTotals } from '../hooks/useInvestments'
import { Modal } from '../components/Modal'
import { InvestmentForm, type InvestmentFormValues } from '../components/InvestmentForm'
import { MovementForm, type MovementFormValues } from '../components/MovementForm'
import { formatCurrency, formatDate } from '../lib/format'
import { triggerSaveFeedback } from '../lib/feedback'
import { INVESTMENT_CATEGORY_COLORS, INVESTMENT_CATEGORY_LABELS, INVESTMENT_MOVEMENT_LABELS } from '../lib/constants'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { TiltCard } from '../components/TiltCard'
import { Recommendations } from '../components/Recommendations'
import { SavingsGoals } from '../components/SavingsGoals'
import type { Investment } from '../types/database'

export function Investments() {
  const { user } = useAuth()
  const { investments, movementsFor, create, update, remove, addMovement, removeMovement } = useInvestments(user?.id)

  const [tab, setTab] = useState<'carteira' | 'recomendacoes' | 'metas'>('carteira')
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
      if (!result.error) {
        setFormModal('closed')
        triggerSaveFeedback()
      }
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
    triggerSaveFeedback()
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
    if (!result.error) {
      setMovementTarget(null)
      triggerSaveFeedback()
    }
    return result
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-lg font-bold uppercase tracking-wider text-cyan-100">Investimentos</h1>
        {tab === 'carteira' && (
          <button onClick={openCreate} className="rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-400 px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-[#031018] shadow-[0_0_20px_-4px_color-mix(in_srgb,var(--color-accent)_80%,transparent)] transition hover:from-cyan-400 hover:to-cyan-300">
            + Novo
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setTab('carteira')}
          className={`rounded-lg border px-2 py-2.5 font-display text-[11px] font-semibold uppercase tracking-wider transition ${
            tab === 'carteira' ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-200 shadow-[0_0_16px_-6px_color-mix(in_srgb,var(--color-accent)_70%,transparent)]' : 'border-cyan-500/20 text-slate-400'
          }`}
        >
          📊 Carteira
        </button>
        <button
          onClick={() => setTab('metas')}
          className={`rounded-lg border px-2 py-2.5 font-display text-[11px] font-semibold uppercase tracking-wider transition ${
            tab === 'metas' ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-200 shadow-[0_0_16px_-6px_color-mix(in_srgb,var(--color-accent)_70%,transparent)]' : 'border-cyan-500/20 text-slate-400'
          }`}
        >
          🎯 Metas
        </button>
        <button
          onClick={() => setTab('recomendacoes')}
          className={`rounded-lg border px-2 py-2.5 font-display text-[11px] font-semibold uppercase tracking-wider transition ${
            tab === 'recomendacoes' ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-200 shadow-[0_0_16px_-6px_color-mix(in_srgb,var(--color-accent)_70%,transparent)]' : 'border-cyan-500/20 text-slate-400'
          }`}
        >
          🧭 Dicas
        </button>
      </div>

      {tab === 'recomendacoes' && <Recommendations userId={user?.id} investments={investments} />}
      {tab === 'metas' && <SavingsGoals userId={user?.id} />}

      {tab === 'carteira' && (
        <>
      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Investido" value={totals.invested} color="text-slate-200" />
        <MiniStat label="Patrimônio atual" value={totals.current} color="text-cyan-300" />
        <MiniStat
          label="Ganho"
          value={totals.gain}
          color={totals.gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}
          suffix={totals.invested > 0 ? ` (${totals.gainPct >= 0 ? '+' : ''}${totals.gainPct.toFixed(1)}%)` : ''}
        />
      </div>

      {allocation.length > 0 && (
        <div className="hud-panel p-4">
          <h2 className="mb-3 font-display text-xs font-semibold uppercase tracking-wider text-cyan-300/70">Alocação da carteira</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={allocation} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                {allocation.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} stroke="rgba(5,8,16,0.6)" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                contentStyle={{
                  background: 'rgba(8,15,28,0.92)',
                  border: '1px solid color-mix(in srgb, var(--color-accent) 35%, transparent)',
                  borderRadius: 8,
                  color: '#dcecf7',
                  boxShadow: '0 0 20px -4px color-mix(in srgb, var(--color-accent) 50%, transparent)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="space-y-3">
        {investments.length === 0 ? (
          <div className="hud-panel p-8 text-center text-sm text-slate-500">
            Nenhum investimento cadastrado ainda. Adicione o primeiro para começar a acompanhar sua carteira.
          </div>
        ) : (
          investments.map((inv) => {
            const isOpen = expanded === inv.id
            const movements = movementsFor(inv.id)
            return (
              <div key={inv.id} className="hud-panel p-4">
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
                    <p className="glow-text font-display text-sm font-bold text-cyan-100">
                      <AnimatedNumber value={inv.currentValue} format={formatCurrency} />
                    </p>
                    <p className={`glow-text text-xs ${inv.gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {inv.gain >= 0 ? '+' : ''}
                      {formatCurrency(inv.gain)} ({inv.gainPct >= 0 ? '+' : ''}
                      {inv.gainPct.toFixed(1)}%)
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => setMovementTarget(inv)} className="rounded-lg border border-cyan-500/20 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-cyan-500/10">
                    + Movimentação
                  </button>
                  <button onClick={() => openEdit(inv)} className="rounded-lg border border-cyan-500/20 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-cyan-500/10">
                    Editar
                  </button>
                  <button onClick={() => handleDelete(inv)} className="rounded-lg border border-cyan-500/20 px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-500/10">
                    Excluir
                  </button>
                  <button onClick={() => setExpanded(isOpen ? null : inv.id)} className="ml-auto text-xs text-slate-500 hover:text-cyan-300">
                    {isOpen ? 'Ocultar histórico ▲' : `Histórico (${movements.length}) ▼`}
                  </button>
                </div>

                {isOpen && (
                  <ul className="mt-3 space-y-1.5 border-t border-cyan-500/15 pt-3">
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
                            <button onClick={() => removeMovement(m.id)} className="text-slate-500 hover:text-rose-400">
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
        </>
      )}

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
    <TiltCard>
      <div className="hud-panel h-full p-3 text-center">
        <p className="font-display text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
        <p className={`glow-text mt-0.5 font-display text-sm font-bold ${color}`}>
          <AnimatedNumber value={value} format={formatCurrency} />
          {suffix}
        </p>
      </div>
    </TiltCard>
  )
}
