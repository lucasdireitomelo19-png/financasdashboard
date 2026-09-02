import { useEffect, useMemo, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { useCategories } from '../hooks/useCategories'
import { useInvestments } from '../hooks/useInvestments'
import { usePaymentAccounts } from '../hooks/usePaymentAccounts'
import { useRecurringSync } from '../hooks/useRecurringSync'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatMonthLabel, monthsAgoRange } from '../lib/format'
import { CHART_COLORS } from '../lib/constants'
import { currentCreditCardCycle, computeVrBalance, cycleRangeIso } from '../lib/accountCycles'
import { computeInsights, type Insight } from '../lib/insights'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { TiltCard } from '../components/TiltCard'
import type { Transaction } from '../types/database'
import { Link } from 'react-router-dom'

const HUD_TOOLTIP_STYLE = {
  background: 'rgba(8,15,28,0.92)',
  border: '1px solid color-mix(in srgb, var(--color-accent) 35%, transparent)',
  borderRadius: 8,
  color: '#dcecf7',
  boxShadow: '0 0 20px -4px color-mix(in srgb, var(--color-accent) 50%, transparent)',
}

const INSIGHT_STYLES: Record<Insight['tone'], { border: string; bg: string; text: string; icon: string }> = {
  alert: { border: 'border-rose-500/40', bg: 'bg-rose-500/10', text: 'text-rose-300', icon: '⚠️' },
  positive: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-300', icon: '✅' },
  info: { border: 'border-cyan-500/30', bg: 'bg-cyan-500/10', text: 'text-cyan-200', icon: 'ℹ️' },
}

export function Dashboard() {
  const { user } = useAuth()
  const displayName = (user?.user_metadata?.display_name as string | undefined)?.trim()
  const { categories } = useCategories(user?.id)
  const { investments, loading: loadingInvestments } = useInvestments(user?.id)
  const { accounts } = usePaymentAccounts(user?.id)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  useRecurringSync(user?.id, () => setReloadKey((k) => k + 1))

  useEffect(() => {
    if (!user) return
    setLoading(true)
    const { start, end } = monthsAgoRange(6)
    supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', start)
      .lte('date', end)
      .then(({ data }) => {
        setTransactions(data ?? [])
        setLoading(false)
      })
  }, [user, reloadKey])

  const now = new Date()
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`

  const currentMonthTx = useMemo(() => transactions.filter((t) => t.date.startsWith(currentMonthKey)), [transactions, currentMonthKey])
  const previousMonthTx = useMemo(() => transactions.filter((t) => t.date.startsWith(prevMonthKey)), [transactions, prevMonthKey])

  const income = currentMonthTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const expense = currentMonthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const balance = income - expense

  const totalInvested = investments.reduce((s, i) => s + i.currentValue, 0)
  const netWorth = totalInvested

  const activeAccounts = useMemo(() => accounts.filter((a) => !a.archived), [accounts])
  const accountBalances = useMemo(
    () =>
      activeAccounts.map((a) => {
        if (a.type === 'vale') {
          return { account: a, value: computeVrBalance(a, transactions, now), label: 'disponível' }
        }
        const cycle = currentCreditCardCycle(a, now)
        const { start, end } = cycleRangeIso(cycle)
        const value = transactions.filter((t) => t.account_id === a.id && t.type === 'expense' && t.date >= start && t.date <= end).reduce((s, t) => s + Number(t.amount), 0)
        return { account: a, value, label: 'fatura atual' }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeAccounts, transactions],
  )

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  const insights = useMemo(() => computeInsights(currentMonthTx, previousMonthTx, categoryMap), [currentMonthTx, previousMonthTx, categoryMap])

  const expenseByCategory = useMemo(() => {
    const totals = new Map<string, number>()
    for (const t of currentMonthTx) {
      if (t.type !== 'expense') continue
      const key = t.category_id ?? 'sem-categoria'
      totals.set(key, (totals.get(key) ?? 0) + Number(t.amount))
    }
    return Array.from(totals.entries())
      .map(([categoryId, value]) => ({
        name: categoryId === 'sem-categoria' ? 'Sem categoria' : (categoryMap.get(categoryId)?.name ?? 'Outros'),
        value,
        color: categoryId === 'sem-categoria' ? '#6b7280' : (categoryMap.get(categoryId)?.color ?? '#6b7280'),
      }))
      .sort((a, b) => b.value - a.value)
  }, [currentMonthTx, categoryMap])

  const evolution = useMemo(() => {
    const months: { key: string; label: string; entradas: number; saidas: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      months.push({ key, label: formatMonthLabel(`${key}-01`), entradas: 0, saidas: 0 })
    }
    for (const t of transactions) {
      const key = t.date.slice(0, 7)
      const m = months.find((x) => x.key === key)
      if (!m) continue
      if (t.type === 'income') m.entradas += Number(t.amount)
      else m.saidas += Number(t.amount)
    }
    return months
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions])

  // taxa de poupança média dos últimos 3 meses completos (exclui o mês atual, que ainda não fechou)
  const avgMonthlySavings = useMemo(() => {
    const closedMonths = evolution.slice(0, 5).slice(-3)
    if (closedMonths.length === 0) return 0
    const total = closedMonths.reduce((s, m) => s + (m.entradas - m.saidas), 0)
    return total / closedMonths.length
  }, [evolution])

  const projection = useMemo(() => {
    const points: { label: string; valor: number }[] = [{ label: 'Hoje', valor: netWorth }]
    for (let i = 1; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      points.push({ label: formatMonthLabel(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`), valor: netWorth + avgMonthlySavings * i })
    }
    return points
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [netWorth, avgMonthlySavings])

  const recent = [...currentMonthTx].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-lg font-bold uppercase tracking-wider text-cyan-100">
          Olá{displayName ? `, ${displayName}` : ''} 👋
        </h1>
        <p className="text-sm text-slate-400">Resumo de {formatMonthLabel(`${currentMonthKey}-01`)}</p>
      </div>

      <TiltCard>
        <div className="hud-panel p-5">
          <p className="font-display text-[10px] uppercase tracking-wider text-slate-500">Patrimônio líquido</p>
          <p className="glow-text mt-1 font-display text-3xl font-bold text-cyan-100">
            {loading || loadingInvestments ? '···' : <AnimatedNumber value={netWorth} format={formatCurrency} />}
          </p>
          <p className="mt-1 text-xs text-slate-500">Soma de todos os seus investimentos</p>

          {avgMonthlySavings !== 0 && (
            <div className="mt-4 border-t border-cyan-500/15 pt-4">
              <p className="mb-2 text-xs text-slate-400">
                Guardando sua média de{' '}
                <span className={avgMonthlySavings >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{formatCurrency(avgMonthlySavings)}/mês</span>, em 6 meses seu patrimônio pode chegar a{' '}
                <span className="font-semibold text-cyan-200">{formatCurrency(netWorth + avgMonthlySavings * 6)}</span>.
              </p>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={projection}>
                  <XAxis dataKey="label" stroke="#3d5872" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis hide domain={['dataMin', 'dataMax']} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={HUD_TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="valor" stroke="#ffb020" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3, fill: '#ffb020' }} />
                </LineChart>
              </ResponsiveContainer>
              <p className="mt-1 text-center text-[10px] uppercase tracking-wider text-slate-600">Projeção · não é garantia de rentabilidade</p>
            </div>
          )}
        </div>
      </TiltCard>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Entradas" value={income} color="text-emerald-400" loading={loading} />
        <StatCard label="Saídas" value={expense} color="text-rose-400" loading={loading} />
        <StatCard label="Saldo do mês" value={balance} color={balance >= 0 ? 'text-emerald-400' : 'text-rose-400'} loading={loading} />
        <StatCard label="Patrimônio investido" value={totalInvested} color="text-cyan-300" loading={loadingInvestments} />
      </div>

      {accountBalances.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-cyan-300/70">Suas contas</h2>
            <Link to="/contas" className="font-display text-[11px] uppercase tracking-wide text-cyan-400 hover:underline">
              Gerenciar
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {accountBalances.map(({ account: a, value, label }) => (
              <TiltCard key={a.id}>
                <div className="hud-panel h-full p-3 text-center">
                  <p className="flex items-center justify-center gap-1.5 font-display text-[10px] uppercase tracking-wider text-slate-500">
                    <span className="text-sm">{a.icon}</span> {a.name}
                  </p>
                  <p className="glow-text mt-1 font-display text-base font-bold" style={{ color: a.color }}>
                    <AnimatedNumber value={value} format={formatCurrency} />
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-500">{label}</p>
                </div>
              </TiltCard>
            ))}
          </div>
        </div>
      )}

      {insights.length > 0 && (
        <div className="hud-panel p-4">
          <h2 className="mb-3 font-display text-xs font-semibold uppercase tracking-wider text-cyan-300/70">Insights do mês</h2>
          <div className="space-y-2">
            {insights.map((ins) => {
              const style = INSIGHT_STYLES[ins.tone]
              return (
                <div key={ins.id} className={`rounded-lg border px-3 py-2.5 ${style.border} ${style.bg}`}>
                  <div className="flex items-start gap-2">
                    <span className="text-base leading-none">{style.icon}</span>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${style.text}`}>{ins.title}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{ins.description}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="hud-panel p-4">
          <h2 className="mb-3 font-display text-xs font-semibold uppercase tracking-wider text-cyan-300/70">Gastos por categoria (mês atual)</h2>
          {expenseByCategory.length === 0 ? (
            <EmptyChart text="Nenhum gasto registrado neste mês ainda." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={expenseByCategory} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {expenseByCategory.map((entry, i) => (
                    <Cell key={entry.name} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} stroke="rgba(5,8,16,0.6)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={HUD_TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="hud-panel p-4">
          <h2 className="mb-3 font-display text-xs font-semibold uppercase tracking-wider text-cyan-300/70">Entradas x Saídas (últimos 6 meses)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={evolution}>
              <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--color-accent) 8%, transparent)" vertical={false} />
              <XAxis dataKey="label" stroke="#3d5872" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#3d5872" fontSize={12} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={HUD_TOOLTIP_STYLE} cursor={{ fill: 'color-mix(in srgb, var(--color-accent) 6%, transparent)' }} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              <Bar dataKey="entradas" fill="#2dffb0" radius={[4, 4, 0, 0]} />
              <Bar dataKey="saidas" fill="#ff4d6a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="hud-panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-cyan-300/70">Últimos lançamentos</h2>
          <Link to="/lancamentos" className="font-display text-[11px] uppercase tracking-wide text-cyan-400 hover:underline">
            Ver todos
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyChart text="Nenhum lançamento este mês." />
        ) : (
          <ul className="divide-y divide-cyan-500/10">
            {recent.map((t) => {
              const cat = t.category_id ? categoryMap.get(t.category_id) : null
              return (
                <li key={t.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{cat?.icon ?? '💸'}</span>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{t.description || cat?.name || 'Sem descrição'}</p>
                      <p className="text-xs text-slate-500">
                        {cat?.name ?? 'Sem categoria'} · {t.date.split('-').reverse().join('/')}
                      </p>
                    </div>
                  </div>
                  <span className={`glow-text text-sm font-semibold ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {t.type === 'income' ? '+' : '-'} {formatCurrency(Number(t.amount))}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color, loading, hint }: { label: string; value: number; color: string; loading: boolean; hint?: string }) {
  return (
    <TiltCard>
      <div className="hud-panel h-full p-4">
        <p className="font-display text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
        <p className={`glow-text mt-1 font-display text-lg font-bold ${color}`}>
          {loading ? '···' : <AnimatedNumber value={value} format={formatCurrency} />}
        </p>
        {hint && <p className="mt-1 text-[10px] text-slate-500">{hint}</p>}
      </div>
    </TiltCard>
  )
}

function EmptyChart({ text }: { text: string }) {
  return <div className="flex h-40 items-center justify-center text-center text-sm text-slate-500">{text}</div>
}
