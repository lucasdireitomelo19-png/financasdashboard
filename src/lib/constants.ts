import type { InvestmentCategory, InvestmentMovementType, PaymentAccountType, PaymentMethod } from '../types/database'

export const DEFAULT_CATEGORIES: { name: string; type: 'expense' | 'income'; color: string; icon: string }[] = [
  // gastos
  { name: 'Moradia', type: 'expense', color: '#f97316', icon: '🏠' },
  { name: 'Mercado', type: 'expense', color: '#22c55e', icon: '🛒' },
  { name: 'Transporte', type: 'expense', color: '#3b82f6', icon: '🚗' },
  { name: 'Alimentação', type: 'expense', color: '#eab308', icon: '🍔' },
  { name: 'Saúde', type: 'expense', color: '#ef4444', icon: '💊' },
  { name: 'Educação', type: 'expense', color: '#8b5cf6', icon: '📚' },
  { name: 'Lazer', type: 'expense', color: '#ec4899', icon: '🎮' },
  { name: 'Assinaturas', type: 'expense', color: '#06b6d4', icon: '📺' },
  { name: 'Compras', type: 'expense', color: '#f59e0b', icon: '🛍️' },
  { name: 'Contas e utilidades', type: 'expense', color: '#64748b', icon: '💡' },
  { name: 'Cuidados pessoais', type: 'expense', color: '#d946ef', icon: '💇' },
  { name: 'Pets', type: 'expense', color: '#84cc16', icon: '🐾' },
  { name: 'Viagem', type: 'expense', color: '#0ea5e9', icon: '✈️' },
  { name: 'Impostos e taxas', type: 'expense', color: '#78716c', icon: '🧾' },
  { name: 'Outros gastos', type: 'expense', color: '#6b7280', icon: '📦' },
  // entradas
  { name: 'Salário', type: 'income', color: '#22c55e', icon: '💼' },
  { name: 'Freelance', type: 'income', color: '#14b8a6', icon: '💻' },
  { name: 'Bônus/13º', type: 'income', color: '#a3e635', icon: '🎁' },
  { name: 'Vendas', type: 'income', color: '#f59e0b', icon: '🏷️' },
  { name: 'Reembolso', type: 'income', color: '#38bdf8', icon: '↩️' },
  { name: 'Rendimentos', type: 'income', color: '#10b981', icon: '📈' },
  { name: 'Outras entradas', type: 'income', color: '#6b7280', icon: '💰' },
]

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  dinheiro: 'Dinheiro',
  debito: 'Débito',
  credito: 'Crédito',
  pix: 'Pix',
  transferencia: 'Transferência',
  boleto: 'Boleto',
  outro: 'Outro',
}

export const INVESTMENT_CATEGORY_LABELS: Record<InvestmentCategory, string> = {
  renda_fixa: 'Renda fixa',
  acoes: 'Ações',
  fundos: 'Fundos',
  fiis: 'Fundos imobiliários',
  cripto: 'Criptomoedas',
  previdencia: 'Previdência',
  tesouro: 'Tesouro Direto',
  reserva_emergencia: 'Reserva de emergência',
  outros: 'Outros',
}

export const INVESTMENT_MOVEMENT_LABELS: Record<InvestmentMovementType, string> = {
  aporte: 'Aporte',
  resgate: 'Resgate',
  rendimento: 'Rendimento',
  ajuste: 'Ajuste de valor',
}

export const INVESTMENT_CATEGORY_COLORS: Record<InvestmentCategory, string> = {
  renda_fixa: '#22c55e',
  acoes: '#3b82f6',
  fundos: '#8b5cf6',
  fiis: '#f59e0b',
  cripto: '#ef4444',
  previdencia: '#14b8a6',
  tesouro: '#06b6d4',
  reserva_emergencia: '#84cc16',
  outros: '#6b7280',
}

export const ACCOUNT_TYPE_LABELS: Record<PaymentAccountType, string> = {
  cartao_credito: 'Cartão de crédito',
  vale: 'Vale (VR/VA)',
}

export const CHART_COLORS = [
  '#10b981',
  '#3b82f6',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#84cc16',
  '#06b6d4',
  '#d946ef',
  '#64748b',
]
