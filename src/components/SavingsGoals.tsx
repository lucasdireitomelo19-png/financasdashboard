import { useMemo, useState } from 'react'
import { useSavingsGoals, type SavingsGoalWithTotal } from '../hooks/useSavingsGoals'
import type { InvestmentWithTotals } from '../hooks/useInvestments'
import { Modal } from './Modal'
import { SavingsGoalForm, type SavingsGoalFormValues } from './SavingsGoalForm'
import { GoalContributionForm, type ContributionFormValues } from './GoalContributionForm'
import { AnimatedNumber } from './AnimatedNumber'
import { formatCurrency, formatDate } from '../lib/format'
import { triggerSaveFeedback } from '../lib/feedback'
import type { SavingsGoal } from '../types/database'

export function SavingsGoals({ userId, investments }: { userId: string | undefined; investments: InvestmentWithTotals[] }) {
  const investmentValueById = useMemo(() => new Map(investments.map((i) => [i.id, i.currentValue])), [investments])
  const investmentNameById = useMemo(() => new Map(investments.map((i) => [i.id, i.name])), [investments])
  const { goals, create, update, remove, addContribution, removeContribution, contributionsFor } = useSavingsGoals(userId, investmentValueById)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SavingsGoal | null>(null)
  const [contribTarget, setContribTarget] = useState<SavingsGoalWithTotal | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const handleSubmit = async (values: SavingsGoalFormValues) => {
    const payload = {
      name: values.name,
      target_amount: Number(values.target_amount),
      target_date: values.target_date || null,
      icon: values.icon,
      color: values.color,
      archived: false,
      linked_investment_id: values.linked_investment_id || null,
    }
    const result = editing ? await update(editing.id, payload) : await create(payload)
    if (!result.error) {
      setFormOpen(false)
      triggerSaveFeedback()
    }
    return result
  }

  const handleDelete = async (g: SavingsGoal) => {
    if (!confirm(`Excluir a meta "${g.name}" e todo o histórico de aportes?`)) return
    await remove(g.id)
  }

  const handleContribution = async (values: ContributionFormValues) => {
    if (!contribTarget) return { error: 'Selecione uma meta' }
    const amount = values.direction === 'retirada' ? -Number(values.amount) : Number(values.amount)
    const result = await addContribution({ goal_id: contribTarget.id, amount, date: values.date, notes: null })
    if (!result.error) {
      setContribTarget(null)
      triggerSaveFeedback()
    }
    return result
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">Guarde dinheiro com um objetivo — viagem, reserva, o que for.</p>
        <button
          onClick={openCreate}
          className="shrink-0 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-400 px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-[#031018] shadow-[0_0_20px_-4px_color-mix(in_srgb,var(--color-accent)_80%,transparent)] transition hover:from-cyan-400 hover:to-cyan-300"
        >
          + Meta
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="panel-calm p-8 text-center text-sm text-slate-500">Nenhuma meta cadastrada ainda. Crie a primeira e comece a guardar.</div>
      ) : (
        <div className="space-y-3">
          {goals.map((g) => {
            const isOpen = expanded === g.id
            const contributions = contributionsFor(g.id)
            const remaining = g.target_amount - g.saved
            return (
              <div key={g.id} className="panel-calm p-4">
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => setExpanded(isOpen ? null : g.id)} className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{g.icon}</span>
                      <p className="text-sm font-semibold text-slate-100">{g.name}</p>
                    </div>
                    {g.target_date && <p className="mt-0.5 text-xs text-slate-500">até {formatDate(g.target_date)}</p>}
                    {g.linked_investment_id && (
                      <p className="mt-0.5 text-xs text-cyan-400/80">🔗 vinculada a {investmentNameById.get(g.linked_investment_id) ?? 'investimento'}</p>
                    )}
                  </button>
                  <div className="text-right">
                    <p className="font-display text-sm font-bold" style={{ color: g.color }}>
                      <AnimatedNumber value={g.saved} format={formatCurrency} />
                    </p>
                    <p className="text-xs text-slate-500">de {formatCurrency(g.target_amount)}</p>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="h-2 overflow-hidden rounded-full bg-[#0a1120]">
                    <div className="h-full rounded-full transition-all" style={{ width: `${g.pct}%`, background: g.color, boxShadow: `0 0 10px ${g.color}99` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {g.pct.toFixed(0)}% concluído{remaining > 0 ? ` · faltam ${formatCurrency(remaining)}` : ' · meta batida! 🎉'}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {!g.linked_investment_id && (
                    <button onClick={() => setContribTarget(g)} className="rounded-lg border border-cyan-500/20 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-cyan-500/10">
                      + Movimentação
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setEditing(g)
                      setFormOpen(true)
                    }}
                    className="rounded-lg border border-cyan-500/20 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-cyan-500/10"
                  >
                    Editar
                  </button>
                  <button onClick={() => handleDelete(g)} className="rounded-lg border border-cyan-500/20 px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-500/10">
                    Excluir
                  </button>
                  {!g.linked_investment_id && (
                    <button onClick={() => setExpanded(isOpen ? null : g.id)} className="ml-auto text-xs text-slate-500 hover:text-cyan-300">
                      {isOpen ? 'Ocultar histórico ▲' : `Histórico (${contributions.length}) ▼`}
                    </button>
                  )}
                </div>

                {isOpen && !g.linked_investment_id && (
                  <ul className="mt-3 space-y-1.5 border-t border-cyan-500/15 pt-3">
                    {contributions.length === 0 ? (
                      <p className="text-xs text-slate-500">Nenhuma movimentação registrada.</p>
                    ) : (
                      contributions.map((c) => (
                        <li key={c.id} className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">{formatDate(c.date)}</span>
                          <span className="flex items-center gap-2">
                            <span className={`font-medium ${Number(c.amount) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                              {Number(c.amount) >= 0 ? '+' : ''}
                              {formatCurrency(Number(c.amount))}
                            </span>
                            <button onClick={() => removeContribution(c.id)} className="text-slate-500 hover:text-rose-400">
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
          })}
        </div>
      )}

      {formOpen && (
        <Modal title={editing ? 'Editar meta' : 'Nova meta'} onClose={() => setFormOpen(false)}>
          <SavingsGoalForm initial={editing} investments={investments} onCancel={() => setFormOpen(false)} onSubmit={handleSubmit} />
        </Modal>
      )}

      {contribTarget && (
        <Modal title={`Movimentação — ${contribTarget.name}`} onClose={() => setContribTarget(null)}>
          <GoalContributionForm onCancel={() => setContribTarget(null)} onSubmit={handleContribution} />
        </Modal>
      )}
    </div>
  )
}
