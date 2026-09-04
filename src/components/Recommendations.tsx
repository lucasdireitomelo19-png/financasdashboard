import { useEffect, useMemo, useState } from 'react'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, ResponsiveContainer, Tooltip } from 'recharts'
import { supabase } from '../lib/supabase'
import { monthsAgoRange } from '../lib/format'
import { useInvestorProfile } from '../hooks/useInvestorProfile'
import { useRecurringTemplates } from '../hooks/useRecurringTemplates'
import { computeDiagnostics, type Finding, type FindingSeverity } from '../lib/diagnostics'
import { RISK_PROFILE_DESCRIPTIONS, RISK_PROFILE_LABELS, TARGET_ALLOCATIONS } from '../lib/investorProfile'
import { INVESTMENT_CATEGORY_LABELS } from '../lib/constants'
import { Modal } from './Modal'
import { ProfileQuiz } from './ProfileQuiz'
import type { InvestmentWithTotals } from '../hooks/useInvestments'
import type { InvestmentCategory, Transaction } from '../types/database'

const MONTHS_CONSIDERED = 3

const SEVERITY_STYLES: Record<FindingSeverity, { border: string; bg: string; text: string; icon: string; label: string }> = {
  alert: { border: 'border-rose-500/40', bg: 'bg-rose-500/10', text: 'text-rose-300', icon: '⚠️', label: 'Atenção' },
  warning: { border: 'border-amber-500/40', bg: 'bg-amber-500/10', text: 'text-amber-300', icon: '🔶', label: 'Ponto de melhoria' },
  info: { border: 'border-cyan-500/30', bg: 'bg-cyan-500/10', text: 'text-cyan-200', icon: 'ℹ️', label: 'Sugestão' },
  success: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-300', icon: '✅', label: 'Em dia' },
}

export function Recommendations({ userId, investments }: { userId: string | undefined; investments: InvestmentWithTotals[] }) {
  const { profile, save } = useInvestorProfile(userId)
  const { templates } = useRecurringTemplates(userId)
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [quizOpen, setQuizOpen] = useState(false)

  useEffect(() => {
    if (!userId) return
    const { start, end } = monthsAgoRange(MONTHS_CONSIDERED)
    supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', start)
      .lte('date', end)
      .then(({ data }) => setRecentTransactions(data ?? []))
  }, [userId])

  const monthlyFixedExpenseTotal = useMemo(
    () =>
      templates
        .filter((t) => t.type === 'expense' && t.active)
        .reduce((s, t) => s + Number(t.amount) * (t.frequency === 'monthly' ? 1 : t.frequency === 'weekly' ? 4.33 : 1 / 12), 0),
    [templates],
  )

  const findings: Finding[] = useMemo(
    () =>
      computeDiagnostics({
        recentTransactions,
        monthsConsidered: MONTHS_CONSIDERED,
        investments,
        monthlyFixedExpenseTotal,
      }),
    [recentTransactions, investments, monthlyFixedExpenseTotal],
  )

  const totalInvested = investments.reduce((s, i) => s + i.currentValue, 0)

  const radarData = useMemo(() => {
    if (!profile) return []
    const target = TARGET_ALLOCATIONS[profile.risk_profile]
    const currentByCategory = new Map<InvestmentCategory, number>()
    for (const inv of investments) {
      currentByCategory.set(inv.category, (currentByCategory.get(inv.category) ?? 0) + inv.currentValue)
    }
    return (Object.keys(INVESTMENT_CATEGORY_LABELS) as InvestmentCategory[]).map((category) => ({
      category: INVESTMENT_CATEGORY_LABELS[category],
      atual: totalInvested > 0 ? Math.round(((currentByCategory.get(category) ?? 0) / totalInvested) * 100) : 0,
      alvo: target[category],
    }))
  }, [profile, investments, totalInvested])

  const handleQuizComplete: React.ComponentProps<typeof ProfileQuiz>['onComplete'] = async (riskProfile, score, answers) => {
    await save(riskProfile, score, answers)
    setQuizOpen(false)
  }

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-cyan-500/25 bg-cyan-500/5 px-3 py-2 text-xs text-cyan-200/80">
        Conteúdo educacional gerado por regras a partir dos seus próprios dados — <strong>não é uma recomendação de investimento individualizada</strong>. Para
        decisões específicas, consulte um profissional certificado.
      </p>

      <div className="panel-calm p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-cyan-300/70">Seu perfil de investidor</h2>
            {profile ? (
              <>
                <p className="mt-1 font-display text-lg font-bold text-cyan-100">{RISK_PROFILE_LABELS[profile.risk_profile]}</p>
                <p className="mt-1 max-w-md text-sm text-slate-400">{RISK_PROFILE_DESCRIPTIONS[profile.risk_profile]}</p>
              </>
            ) : (
              <p className="mt-1 max-w-md text-sm text-slate-400">Responda 5 perguntas rápidas pra descobrir seu perfil e ver uma alocação sugerida.</p>
            )}
          </div>
          <button
            onClick={() => setQuizOpen(true)}
            className="shrink-0 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-400 px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-[#031018] shadow-[0_0_20px_-4px_color-mix(in_srgb,var(--color-accent)_80%,transparent)] transition hover:from-cyan-400 hover:to-cyan-300"
          >
            {profile ? 'Refazer quiz' : 'Fazer quiz'}
          </button>
        </div>
      </div>

      {profile && (
        <div className="panel-calm p-4">
          <h2 className="mb-3 font-display text-xs font-semibold uppercase tracking-wider text-cyan-300/70">Alocação atual x sugerida</h2>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData} outerRadius="72%">
              <PolarGrid stroke="color-mix(in srgb, var(--color-accent) 15%, transparent)" />
              <PolarAngleAxis dataKey="category" stroke="#5c7a94" fontSize={11} />
              <PolarRadiusAxis angle={30} stroke="#3d5872" fontSize={10} tickFormatter={(v) => `${v}%`} />
              <Radar name="Atual" dataKey="atual" stroke="#22e0ff" fill="#22e0ff" fillOpacity={0.28} />
              <Radar name="Sugerido" dataKey="alvo" stroke="#ffb020" fill="#ffb020" fillOpacity={0.12} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              <Tooltip
                formatter={(value) => `${value}%`}
                contentStyle={{
                  background: 'rgba(8,15,28,0.92)',
                  border: '1px solid color-mix(in srgb, var(--color-accent) 35%, transparent)',
                  borderRadius: 8,
                  color: '#dcecf7',
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="panel-calm p-4">
        <h2 className="mb-3 font-display text-xs font-semibold uppercase tracking-wider text-cyan-300/70">Diagnóstico financeiro</h2>
        <div className="space-y-2">
          {findings.map((f) => {
            const style = SEVERITY_STYLES[f.severity]
            return (
              <div key={f.id} className={`rounded-lg border px-3 py-2.5 ${style.border} ${style.bg}`}>
                <div className="flex items-start gap-2">
                  <span className="text-base leading-none">{style.icon}</span>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${style.text}`}>{f.title}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{f.description}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {quizOpen && (
        <Modal title="Perfil de investidor" onClose={() => setQuizOpen(false)}>
          <ProfileQuiz onComplete={handleQuizComplete} onCancel={() => setQuizOpen(false)} />
        </Modal>
      )}
    </div>
  )
}
