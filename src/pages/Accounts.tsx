import { useEffect, useState } from 'react'
import { differenceInCalendarDays } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import { usePaymentAccounts } from '../hooks/usePaymentAccounts'
import { useBillPayments } from '../hooks/useBillPayments'
import { supabase } from '../lib/supabase'
import { Modal } from '../components/Modal'
import { AccountForm, type AccountFormValues } from '../components/AccountForm'
import { currentCreditCardCycle, previousCreditCardCycles, currentVrCycle, cycleRangeIso, dateToIso, type CreditCardCycle, type VrCycle } from '../lib/accountCycles'
import { formatCurrency, formatDate, monthsAgoRange } from '../lib/format'
import { triggerSaveFeedback } from '../lib/feedback'
import { AnimatedNumber } from '../components/AnimatedNumber'
import type { PaymentAccount, Transaction } from '../types/database'

export function Accounts() {
  const { user } = useAuth()
  const { accounts, create, update, remove } = usePaymentAccounts(user?.id)
  const { isPaid, markPaid, markUnpaid } = useBillPayments(user?.id)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PaymentAccount | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    const { start, end } = monthsAgoRange(4)
    supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', start)
      .lte('date', end)
      .then(({ data }) => setTransactions(data ?? []))
  }, [user])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (acc: PaymentAccount) => {
    setEditing(acc)
    setFormOpen(true)
  }

  const handleSubmit = async (values: AccountFormValues) => {
    const payload = {
      name: values.name,
      type: values.type,
      color: values.type === 'cartao_credito' ? '#a78bfa' : '#22e0ff',
      icon: values.type === 'cartao_credito' ? '💳' : '🍽️',
      closing_day: values.type === 'cartao_credito' ? Number(values.closing_day) : null,
      due_day: values.type === 'cartao_credito' ? Number(values.due_day) : null,
      monthly_credit: values.type === 'vale' ? Number(values.monthly_credit) : null,
      credit_day: values.type === 'vale' ? Number(values.credit_day) : null,
      archived: false,
    }
    const result = editing ? await update(editing.id, payload) : await create(payload)
    if (!result.error) {
      setFormOpen(false)
      triggerSaveFeedback()
    }
    return result
  }

  const handleDelete = async (acc: PaymentAccount) => {
    if (!confirm(`Excluir "${acc.name}"? Os lançamentos ligados a ela ficarão sem conta associada.`)) return
    await remove(acc.id)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-lg font-bold uppercase tracking-wider text-cyan-100">Contas</h1>
        <button
          onClick={openCreate}
          className="rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-400 px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-[#031018] shadow-[0_0_20px_-4px_color-mix(in_srgb,var(--color-accent)_80%,transparent)] transition hover:from-cyan-400 hover:to-cyan-300"
        >
          + Nova
        </button>
      </div>
      <p className="text-sm text-slate-400">Cartões de crédito e vale (VR/VA), cada um com o ciclo e o saldo/fatura próprios.</p>

      {accounts.length === 0 ? (
        <div className="hud-panel p-8 text-center text-sm text-slate-500">
          Nenhuma conta cadastrada ainda. Adicione seu cartão de crédito ou vale-refeição/alimentação pra acompanhar a fatura e o saldo.
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) =>
            acc.type === 'cartao_credito' ? (
              <CreditCardAccountCard
                key={acc.id}
                account={acc}
                transactions={transactions}
                isPaid={isPaid}
                markPaid={markPaid}
                markUnpaid={markUnpaid}
                expanded={expanded === acc.id}
                onToggle={() => setExpanded(expanded === acc.id ? null : acc.id)}
                onEdit={() => openEdit(acc)}
                onDelete={() => handleDelete(acc)}
              />
            ) : (
              <VrAccountCard
                key={acc.id}
                account={acc}
                transactions={transactions}
                expanded={expanded === acc.id}
                onToggle={() => setExpanded(expanded === acc.id ? null : acc.id)}
                onEdit={() => openEdit(acc)}
                onDelete={() => handleDelete(acc)}
              />
            ),
          )}
        </div>
      )}

      {formOpen && (
        <Modal title={editing ? 'Editar conta' : 'Nova conta'} onClose={() => setFormOpen(false)}>
          <AccountForm initial={editing} onCancel={() => setFormOpen(false)} onSubmit={handleSubmit} />
        </Modal>
      )}
    </div>
  )
}

function sumAmount(list: Transaction[]): number {
  return list.reduce((s, t) => s + Number(t.amount), 0)
}

function txInRange(transactions: Transaction[], accountId: string, cycle: { start: Date; end: Date }): Transaction[] {
  const { start, end } = cycleRangeIso(cycle)
  return transactions.filter((t) => t.account_id === accountId && t.type === 'expense' && t.date >= start && t.date <= end)
}

function TransactionMiniList({ items }: { items: Transaction[] }) {
  if (items.length === 0) return <p className="text-xs text-slate-500">Nenhum lançamento neste ciclo.</p>
  return (
    <ul className="space-y-1.5">
      {items
        .slice()
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .map((t) => (
          <li key={t.id} className="flex items-center justify-between text-xs">
            <span className="truncate text-slate-400">
              {t.description || 'Sem descrição'} · {formatDate(t.date)}
            </span>
            <span className="shrink-0 font-medium text-rose-300">{formatCurrency(Number(t.amount))}</span>
          </li>
        ))}
    </ul>
  )
}

function CreditCardAccountCard({
  account,
  transactions,
  isPaid,
  markPaid,
  markUnpaid,
  expanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  account: PaymentAccount
  transactions: Transaction[]
  isPaid: (accountId: string, cycleKey: string) => boolean
  markPaid: (accountId: string, cycleKey: string) => Promise<{ error: string | null }>
  markUnpaid: (accountId: string, cycleKey: string) => Promise<{ error: string | null }>
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const today = new Date()
  const current: CreditCardCycle = currentCreditCardCycle(account, today)
  const previous: CreditCardCycle = previousCreditCardCycles(account, 1, today)[0]

  const currentTx = txInRange(transactions, account.id, current)
  const previousTx = txInRange(transactions, account.id, previous)
  const currentTotal = sumAmount(currentTx)
  const previousTotal = sumAmount(previousTx)
  const daysToClose = differenceInCalendarDays(current.end, today)
  const paid = isPaid(account.id, previous.key)

  return (
    <div className="hud-panel p-4">
      <div className="flex items-start justify-between gap-2">
        <button onClick={onToggle} className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-lg">{account.icon}</span>
            <p className="text-sm font-semibold text-slate-100">{account.name}</p>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Fecha dia {account.closing_day} · Vence dia {account.due_day}
          </p>
        </button>
        <div className="flex items-center gap-2">
          <button onClick={onEdit} className="rounded-lg border border-cyan-500/20 px-2.5 py-1 text-xs text-slate-300 hover:bg-cyan-500/10">
            Editar
          </button>
          <button onClick={onDelete} className="rounded-lg border border-cyan-500/20 px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-500/10">
            Excluir
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-cyan-500/20 bg-[#0a1120]/60 p-3">
          <p className="font-display text-[10px] uppercase tracking-wider text-slate-500">Fatura atual</p>
          <p className="glow-text mt-0.5 font-display text-base font-bold text-cyan-100">
            <AnimatedNumber value={currentTotal} format={formatCurrency} />
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">{daysToClose <= 0 ? 'fecha hoje' : `fecha em ${daysToClose} dia${daysToClose === 1 ? '' : 's'}`}</p>
        </div>

        <div className="rounded-lg border border-cyan-500/20 bg-[#0a1120]/60 p-3">
          <p className="font-display text-[10px] uppercase tracking-wider text-slate-500">Fatura anterior</p>
          <p className="glow-text mt-0.5 font-display text-base font-bold text-slate-200">{formatCurrency(previousTotal)}</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="text-[11px] text-slate-500">vence {formatDate(dateToIso(previous.dueDate))}</p>
            {previousTotal > 0 && (
              <button
                onClick={() => (paid ? markUnpaid(account.id, previous.key) : markPaid(account.id, previous.key))}
                className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  paid ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
                }`}
              >
                {paid ? 'Paga ✓' : 'Pendente'}
              </button>
            )}
          </div>
        </div>
      </div>

      <button onClick={onToggle} className="mt-3 text-xs text-slate-500 hover:text-cyan-300">
        {expanded ? 'Ocultar lançamentos da fatura atual ▲' : `Lançamentos da fatura atual (${currentTx.length}) ▼`}
      </button>

      {expanded && (
        <div className="mt-2 border-t border-cyan-500/15 pt-3">
          <TransactionMiniList items={currentTx} />
        </div>
      )}
    </div>
  )
}

function VrAccountCard({
  account,
  transactions,
  expanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  account: PaymentAccount
  transactions: Transaction[]
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const today = new Date()
  const cycle: VrCycle = currentVrCycle(account, today)
  const cycleTx = txInRange(transactions, account.id, cycle)
  const spent = sumAmount(cycleTx)
  const monthlyCredit = Number(account.monthly_credit ?? 0)
  const balance = monthlyCredit - spent
  const pct = monthlyCredit > 0 ? Math.min(100, Math.max(0, (spent / monthlyCredit) * 100)) : 0

  return (
    <div className="hud-panel p-4">
      <div className="flex items-start justify-between gap-2">
        <button onClick={onToggle} className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-lg">{account.icon}</span>
            <p className="text-sm font-semibold text-slate-100">{account.name}</p>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Crédito mensal {formatCurrency(monthlyCredit)} · dia {account.credit_day}
          </p>
        </button>
        <div className="flex items-center gap-2">
          <button onClick={onEdit} className="rounded-lg border border-cyan-500/20 px-2.5 py-1 text-xs text-slate-300 hover:bg-cyan-500/10">
            Editar
          </button>
          <button onClick={onDelete} className="rounded-lg border border-cyan-500/20 px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-500/10">
            Excluir
          </button>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-display text-[10px] uppercase tracking-wider text-slate-500">Saldo disponível</p>
            <p className={`glow-text mt-0.5 font-display text-lg font-bold ${balance >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
              <AnimatedNumber value={balance} format={formatCurrency} />
            </p>
          </div>
          <p className="text-xs text-slate-500">
            gasto: <span className="font-medium text-slate-300">{formatCurrency(spent)}</span>
          </p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#0a1120]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 shadow-[0_0_10px_color-mix(in_srgb,var(--color-accent)_60%,transparent)] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] text-slate-500">
          ciclo: {formatDate(cycleRangeIso(cycle).start)} a {formatDate(cycleRangeIso(cycle).end)}
        </p>
      </div>

      <button onClick={onToggle} className="mt-3 text-xs text-slate-500 hover:text-cyan-300">
        {expanded ? 'Ocultar lançamentos do ciclo ▲' : `Lançamentos do ciclo (${cycleTx.length}) ▼`}
      </button>

      {expanded && (
        <div className="mt-2 border-t border-cyan-500/15 pt-3">
          <TransactionMiniList items={cycleTx} />
        </div>
      )}
    </div>
  )
}
