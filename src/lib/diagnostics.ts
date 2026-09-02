import type { Transaction } from '../types/database'
import type { InvestmentWithTotals } from '../hooks/useInvestments'

export type FindingSeverity = 'alert' | 'warning' | 'info' | 'success'

export interface Finding {
  id: string
  severity: FindingSeverity
  title: string
  description: string
}

const SEVERITY_ORDER: Record<FindingSeverity, number> = { alert: 0, warning: 1, info: 2, success: 3 }

interface DiagnosticsInput {
  /** transações dos últimos ~3 meses completos, para calcular médias */
  recentTransactions: Transaction[]
  monthsConsidered: number
  investments: InvestmentWithTotals[]
  monthlyFixedExpenseTotal: number
}

export function computeDiagnostics({
  recentTransactions,
  monthsConsidered,
  investments,
  monthlyFixedExpenseTotal,
}: DiagnosticsInput): Finding[] {
  const findings: Finding[] = []

  const totalIncome = recentTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = recentTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const months = Math.max(monthsConsidered, 1)
  const avgIncome = totalIncome / months
  const avgExpense = totalExpense / months

  const totalInvested = investments.reduce((s, i) => s + i.currentValue, 0)
  const reserveValue = investments.filter((i) => i.category === 'reserva_emergencia').reduce((s, i) => s + i.currentValue, 0)

  // 1. Reserva de emergência
  if (avgExpense > 0) {
    const coverageMonths = reserveValue / avgExpense
    if (reserveValue === 0) {
      findings.push({
        id: 'reserva-inexistente',
        severity: 'alert',
        title: 'Você ainda não tem reserva de emergência',
        description: 'O ideal é guardar de 3 a 6 meses dos seus gastos em algo líquido (ex: renda fixa/Tesouro) antes de focar em outros investimentos.',
      })
    } else if (coverageMonths < 3) {
      findings.push({
        id: 'reserva-baixa',
        severity: 'warning',
        title: 'Reserva de emergência abaixo do ideal',
        description: `Sua reserva cobre cerca de ${coverageMonths.toFixed(1)} mês(es) de gastos. O recomendado é entre 3 e 6 meses.`,
      })
    } else if (coverageMonths < 6) {
      findings.push({
        id: 'reserva-parcial',
        severity: 'info',
        title: 'Reserva de emergência em bom caminho',
        description: `Sua reserva cobre cerca de ${coverageMonths.toFixed(1)} mês(es) de gastos. Continuar até 6 meses deixa você ainda mais protegido.`,
      })
    } else {
      findings.push({
        id: 'reserva-ok',
        severity: 'success',
        title: 'Reserva de emergência adequada',
        description: `Sua reserva cobre cerca de ${coverageMonths.toFixed(1)} meses de gastos — dentro do recomendado. O excedente pode ir para outros investimentos.`,
      })
    }
  }

  // 2. Taxa de poupança
  if (avgIncome > 0) {
    const rate = (avgIncome - avgExpense) / avgIncome
    if (rate < 0) {
      findings.push({
        id: 'saldo-negativo',
        severity: 'alert',
        title: 'Seus gastos estão maiores que sua renda',
        description: 'Na média dos últimos meses, você gastou mais do que ganhou. Vale revisar os gastos variáveis antes de pensar em investir mais.',
      })
    } else if (rate < 0.1) {
      findings.push({
        id: 'poupanca-baixa',
        severity: 'warning',
        title: 'Taxa de poupança baixa',
        description: `Você guarda cerca de ${(rate * 100).toFixed(0)}% da sua renda. Tentar chegar a pelo menos 10-20% acelera bastante seus objetivos.`,
      })
    } else if (rate < 0.2) {
      findings.push({
        id: 'poupanca-razoavel',
        severity: 'info',
        title: 'Taxa de poupança razoável',
        description: `Você guarda cerca de ${(rate * 100).toFixed(0)}% da sua renda. Chegar a 20% é uma boa próxima meta.`,
      })
    } else {
      findings.push({
        id: 'poupanca-otima',
        severity: 'success',
        title: 'Ótima taxa de poupança',
        description: `Você guarda cerca de ${(rate * 100).toFixed(0)}% da sua renda — bem acima da média. Continue assim.`,
      })
    }
  }

  // 3. Gastos fixos vs renda
  if (avgIncome > 0 && monthlyFixedExpenseTotal > 0) {
    const ratio = monthlyFixedExpenseTotal / avgIncome
    if (ratio > 0.5) {
      findings.push({
        id: 'fixos-altos',
        severity: 'warning',
        title: 'Gastos fixos consomem mais da metade da renda',
        description: `Suas recorrências fixas somam ~${(ratio * 100).toFixed(0)}% da sua renda média. O recomendado geralmente é manter isso abaixo de 50%.`,
      })
    }
  }

  // 4. Concentração da carteira
  if (totalInvested > 0) {
    const byCategory = new Map<string, number>()
    for (const inv of investments) {
      byCategory.set(inv.category, (byCategory.get(inv.category) ?? 0) + inv.currentValue)
    }
    for (const [category, value] of byCategory) {
      const pct = value / totalInvested
      if (pct >= 0.7 && category !== 'reserva_emergencia') {
        findings.push({
          id: `concentracao-${category}`,
          severity: 'warning',
          title: 'Carteira concentrada em uma única categoria',
          description: `Cerca de ${(pct * 100).toFixed(0)}% do seu patrimônio investido está em "${category.replace('_', ' ')}". Diversificar reduz o risco.`,
        })
      }
    }

    const distinctNonReserve = new Set(investments.filter((i) => i.category !== 'reserva_emergencia' && i.currentValue > 0).map((i) => i.category))
    if (distinctNonReserve.size === 1 && totalInvested > reserveValue) {
      findings.push({
        id: 'pouca-diversificacao',
        severity: 'info',
        title: 'Pouca diversificação entre classes de ativo',
        description: 'Você investe em apenas uma categoria além da reserva. Considerar outras classes pode equilibrar melhor o risco.',
      })
    }
  } else {
    findings.push({
      id: 'sem-investimentos',
      severity: 'info',
      title: 'Você ainda não começou a investir',
      description: 'Mesmo pouco, começar cedo faz diferença por causa dos juros compostos. Cadastre seu primeiro investimento na aba Carteira.',
    })
  }

  return findings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
}
