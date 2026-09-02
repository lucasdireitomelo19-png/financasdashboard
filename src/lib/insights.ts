import { formatCurrency } from './format'
import type { Category, Transaction } from '../types/database'

export interface Insight {
  id: string
  tone: 'alert' | 'positive' | 'info'
  title: string
  description: string
}

function sumByCategory(txs: Transaction[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const t of txs) {
    if (t.type !== 'expense' || !t.category_id) continue
    map.set(t.category_id, (map.get(t.category_id) ?? 0) + Number(t.amount))
  }
  return map
}

const MIN_BASELINE = 30
const MIN_ABS_DIFF = 40
const CHANGE_THRESHOLD_PCT = 30

/** Insights simples baseados em regras: comparação de gasto por categoria
 * mês a mês e detecção de gasto atípico dentro da própria categoria. */
export function computeInsights(currentMonthTx: Transaction[], previousMonthTx: Transaction[], categoryMap: Map<string, Category>): Insight[] {
  const insights: Insight[] = []
  const current = sumByCategory(currentMonthTx)
  const previous = sumByCategory(previousMonthTx)

  for (const [catId, curValue] of current) {
    const prevValue = previous.get(catId) ?? 0
    const cat = categoryMap.get(catId)
    if (!cat || prevValue < MIN_BASELINE) continue

    const diffPct = ((curValue - prevValue) / prevValue) * 100
    if (diffPct >= CHANGE_THRESHOLD_PCT && curValue - prevValue >= MIN_ABS_DIFF) {
      insights.push({
        id: `up-${catId}`,
        tone: 'alert',
        title: `${cat.icon} ${cat.name} subiu ${diffPct.toFixed(0)}%`,
        description: `Já foram ${formatCurrency(curValue)} em ${cat.name} este mês, contra ${formatCurrency(prevValue)} no mês passado.`,
      })
    } else if (diffPct <= -CHANGE_THRESHOLD_PCT && prevValue - curValue >= MIN_ABS_DIFF) {
      insights.push({
        id: `down-${catId}`,
        tone: 'positive',
        title: `${cat.icon} ${cat.name} caiu ${Math.abs(diffPct).toFixed(0)}%`,
        description: `${formatCurrency(curValue)} em ${cat.name} este mês — bem menos que os ${formatCurrency(prevValue)} do mês passado.`,
      })
    }
  }

  const byCategoryTx = new Map<string, Transaction[]>()
  for (const t of currentMonthTx) {
    if (t.type !== 'expense' || !t.category_id) continue
    if (!byCategoryTx.has(t.category_id)) byCategoryTx.set(t.category_id, [])
    byCategoryTx.get(t.category_id)!.push(t)
  }

  for (const [catId, txs] of byCategoryTx) {
    if (txs.length < 3) continue
    const amounts = txs.map((t) => Number(t.amount))
    const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length
    const max = Math.max(...amounts)
    if (max >= avg * 2.5 && max - avg >= 50) {
      const tx = txs.find((t) => Number(t.amount) === max)!
      const cat = categoryMap.get(catId)
      insights.push({
        id: `outlier-${tx.id}`,
        tone: 'info',
        title: `Gasto fora do padrão em ${cat?.name ?? 'categoria'}`,
        description: `"${tx.description || cat?.name || 'Lançamento'}" de ${formatCurrency(max)} ficou bem acima da média (${formatCurrency(avg)}) dessa categoria este mês.`,
      })
    }
  }

  return insights.slice(0, 6)
}
