import { useEffect, useMemo, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { useCategories } from '../hooks/useCategories'
import { useInvestments } from '../hooks/useInvestments'
import { usePaymentAccounts } from '../hooks/usePaymentAccounts'
import { useAgendaEvents } from '../hooks/useAgendaEvents'
import { useRecurringTemplates } from '../hooks/useRecurringTemplates'
import { useRecurringSync } from '../hooks/useRecurringSync'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate, formatMonthLabel, monthsAgoRange, todayIso } from '../lib/format'
import { CHART_COLORS, AGENDA_CATEGORY_META } from '../lib/constants'
import { currentCreditCardCycle, computeVrBalance, cycleRangeIso } from '../lib/accountCycles'
import { computeInsights, type Insight } from '../lib/insights'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { TiltCard } from '../components/TiltCard'
import { QuickAddAgenda } from '../components/QuickAddAgenda'
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
  const { events, create: createAgendaEvent } = useAgendaEvents(user?.id)
  const { templates: recurringTemplates } = useRecurringTemplates(user?.id)
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

  // compras no VR/VA saem do benefício, não da conta bancária real — não
  // devem contar no fluxo de caixa "de verdade" (saldo do mês, entradas x
  // saídas, projeção). Elas já aparecem no card da conta em "Suas contas".
  const vrAccountIds = useMemo(() => new Set(accounts.filter((a) => a.type === 'vale').map((a) => a.id)), [accounts])
  const isCashTx = (t: Transaction) => !t.account_id || !vrAccountIds.has(t.account_id)

  const income = currentMonthTx.filter((t) => t.type === 'income' && isCashTx(t)).reduce((s, t) => s + Number(t.amount), 0)
  const expense = currentMonthTx.filter((t) => t.type === 'expense' && isCashTx(t)).reduce((s, t) => s + Number(t.amount), 0)
  const balance = income - expense

  const totalInvested = investments.reduce((s, i) => s + i.currentValue, 0)
  const netWorth = totalInvested

  const monthlyCompanyExpenses = recurringTemplates
    .filter((t) => t.type === 'expense' && t.is_company && t.active)
    .reduce((s, t) => s + Number(t.amount) * (t.frequency === 'monthly' ? 1 : t.frequency === 'weekly' ? 4.33 : 1 / 12), 0)

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

  const upcomingEvents = useMemo(() => {
    const today = todayIso()
    return events
      .filter((e) => !e.done && e.event_date >= today)
      .slice(0, 4)
  }, [events])

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
      if (!isCashTx(t)) continue
      const key = t.date.slice(0, 7)
      const m = months.find((x) => x.key === key)
      if (!m) continue
      if (t.type === 'income') m.entradas += Number(t.amount)
      else m.saidas += Number(t.amount)
    }
    return months
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, vrAccountIds])

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

  const entradasSeries = useMemo(() => evolution.map((m) => m.entradas), [evolution])
  const saidasSeries = useMemo(() => evolution.map((m) => m.saidas), [evolution])
  const saldoSeries = useMemo(() => evolution.map((m) => m.entradas - m.saidas), [evolution])

  return (
    <div className="space-y-7">
      <div>
        <h1 className="font-display text-lg font-bold uppercase tracking-wider text-cyan-100">
          Olá{displayName ? `, ${displayName}` : ''} 👋
        </h1>
        <p className="text-sm text-slate-400">Resumo de {formatMonthLabel(`${currentMonthKey}-01`)}</p>
      </div>

      <TiltCard>
        <div className="hud-panel relative overflow-hidden p-0" style={{ height: 260 }}>
          <div className="absolute inset-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projection} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22e0ff" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#22e0ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="valor" stroke="#22e0ff" strokeWidth={3} fill="url(#heroFill)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(180deg, rgba(5,8,16,0.15) 0%, rgba(5,8,16,0.55) 55%, rgba(5,8,16,0.92) 100%)' }}
          />
          <div className="relative flex h-full flex-col justify-between p-5">
            <p className="font-display text-[10px] uppercase tracking-wider text-cyan-100/70">Patrimônio líquido</p>
            <div>
              <p className="glow-text font-display text-3xl font-bold text-cyan-300">
                {loading || loadingInvestments ? '···' : <AnimatedNumber value={netWorth} format={formatCurrency} />}
              </p>
              <p className="mt-1 text-xs text-slate-300">
                Guardando sua média de{' '}
                <span className={avgMonthlySavings >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{formatCurrency(avgMonthlySavings)}/mês</span>, projeção em 6 meses:{' '}
                <span className="font-semibold text-cyan-200">{formatCurrency(netWorth + avgMonthlySavings * 6)}</span>
              </p>
            </div>
          </div>
        </div>
      </TiltCard>
      <p className="-mt-4 text-center text-[10px] uppercase tracking-wider text-slate-600">Projeção · não é garantia de rentabilidade</p>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/5 bg-white/5 sm:grid-cols-4">
        <TickerCell label="Entradas" value={income} color="text-emerald-400" loading={loading} spark={entradasSeries} sparkColor="#2dffb0" />
        <TickerCell label="Saídas" value={expense} color="text-rose-400" loading={loading} spark={saidasSeries} sparkColor="#ff4d6a" />
        <TickerCell
          label="Saldo do mês"
          value={balance}
          color={balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}
          loading={loading}
          spark={saldoSeries}
          sparkColor={balance >= 0 ? '#2dffb0' : '#ff4d6a'}
        />
        <TickerCell label="Patrimônio investido" value={totalInvested} color="text-cyan-300" loading={loadingInvestments} />
      </div>

      {monthlyCompanyExpenses > 0 && (
        <Link to="/recorrentes">
          <div className="panel-calm flex items-center justify-between p-4">
            <p className="font-display text-[10px] uppercase tracking-wider text-slate-500">🏢 Gastos da empresa / mês (aprox.)</p>
            <p className="font-display text-sm font-bold text-amber-400">
              <AnimatedNumber value={monthlyCompanyExpenses} format={formatCurrency} />
            </p>
          </div>
        </Link>
      )}

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
              <div key={a.id} className="panel-calm h-full p-4 text-center">
                <p className="flex items-center justify-center gap-1.5 font-display text-[10px] uppercase tracking-wider text-slate-500">
                  <span className="text-sm">{a.icon}</span> {a.name}
                </p>
                <p className="mt-1 font-display text-base font-bold" style={{ color: a.color }}>
                  <AnimatedNumber value={value} format={formatCurrency} />
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <QuickAddAgenda onCreate={createAgendaEvent} />

      {upcomingEvents.length > 0 && (
        <div className="panel-calm p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-cyan-300/70">Próximos compromissos</h2>
            <Link to="/agenda" className="font-display text-[11px] uppercase tracking-wide text-cyan-400 hover:underline">
              Ver agenda
            </Link>
          </div>
          <ul className="divide-y divide-cyan-500/10">
            {upcomingEvents.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 py-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: (AGENDA_CATEGORY_META[e.category] ?? AGENDA_CATEGORY_META.outro).color }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 truncate text-sm text-slate-200">{e.title}</span>
                </span>
                <span className="shrink-0 text-xs text-slate-500">
                  {formatDate(e.event_date)}
                  {e.event_time ? ` · ${e.event_time.slice(0, 5)}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {insights.length > 0 && (
        <div className="panel-calm p-4">
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
        <div className="panel-calm p-4">
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

        <div className="panel-calm p-4">
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

      <div className="panel-calm p-4">
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
                  <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
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

function sparkPath(values: number[], w = 52, h = 16) {
  if (values.length < 2) return ''
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const step = w / (values.length - 1)
  return values.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`).join(' ')
}

function TickerCell({
  label,
  value,
  color,
  loading,
  spark,
  sparkColor,
}: {
  label: string
  value: number
  color: string
  loading: boolean
  spark?: number[]
  sparkColor?: string
}) {
  const path = spark ? sparkPath(spark) : ''
  return (
    <div className="h-full bg-[rgba(15,23,38,0.7)] p-3">
      <p className="font-display text-[9px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 font-display text-[13px] font-bold ${color}`}>
        {loading ? '···' : <AnimatedNumber value={value} format={formatCurrency} />}
      </p>
      {path && (
        <svg className="mt-1 block" width="52" height="16" viewBox="0 0 52 16">
          <path d={path} fill="none" stroke={sparkColor ?? '#22e0ff'} strokeWidth={1.5} />
        </svg>
      )}
    </div>
  )
}

function EmptyChart({ text }: { text: string }) {
  return <div className="flex h-40 items-center justify-center text-center text-sm text-slate-500">{text}</div>
}
