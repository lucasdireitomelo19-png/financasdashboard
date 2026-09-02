export type TransactionType = 'expense' | 'income'
export type RecurrenceFrequency = 'weekly' | 'monthly' | 'yearly'
export type InvestmentCategory =
  | 'renda_fixa'
  | 'acoes'
  | 'fundos'
  | 'fiis'
  | 'cripto'
  | 'previdencia'
  | 'tesouro'
  | 'reserva_emergencia'
  | 'outros'
export type InvestmentMovementType = 'aporte' | 'resgate' | 'rendimento' | 'ajuste'
export type PaymentMethod = 'dinheiro' | 'debito' | 'credito' | 'pix' | 'transferencia' | 'boleto' | 'outro'

export interface Category {
  id: string
  user_id: string
  name: string
  type: TransactionType
  color: string
  icon: string
  is_default: boolean
  created_at: string
}

export interface RecurringTemplate {
  id: string
  user_id: string
  type: TransactionType
  amount: number
  category_id: string | null
  description: string
  frequency: RecurrenceFrequency
  day_of_month: number | null
  day_of_week: number | null
  start_date: string
  end_date: string | null
  active: boolean
  payment_method: PaymentMethod | null
  last_generated_date: string | null
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType
  amount: number
  category_id: string | null
  description: string
  date: string
  payment_method: PaymentMethod | null
  is_variable: boolean
  recurring_template_id: string | null
  notes: string | null
  created_at: string
}

export interface Investment {
  id: string
  user_id: string
  name: string
  category: InvestmentCategory
  institution: string | null
  date_invested: string
  notes: string | null
  archived: boolean
  created_at: string
}

export interface InvestmentMovement {
  id: string
  investment_id: string
  user_id: string
  type: InvestmentMovementType
  amount: number
  date: string
  notes: string | null
  created_at: string
}
