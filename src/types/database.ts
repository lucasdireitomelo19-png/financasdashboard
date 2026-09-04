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
export type RiskProfile = 'conservador' | 'moderado' | 'arrojado'
export type PaymentAccountType = 'cartao_credito' | 'vale'

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
  account_id: string | null
  is_company: boolean
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
  account_id: string | null
  installment_group_id: string | null
  installment_number: number | null
  installment_total: number | null
  notes: string | null
  created_at: string
}

export interface PaymentAccount {
  id: string
  user_id: string
  name: string
  type: PaymentAccountType
  color: string
  icon: string
  closing_day: number | null
  due_day: number | null
  monthly_credit: number | null
  credit_day: number | null
  archived: boolean
  created_at: string
}

export interface CreditCardBillPayment {
  id: string
  account_id: string
  user_id: string
  cycle_key: string
  paid: boolean
  paid_date: string
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

export interface InvestorProfile {
  user_id: string
  risk_profile: RiskProfile
  score: number
  answers: Record<string, number> | null
  updated_at: string
}

export interface CategoryBudget {
  id: string
  user_id: string
  category_id: string
  monthly_limit: number
  created_at: string
}

export interface SavingsGoal {
  id: string
  user_id: string
  name: string
  target_amount: number
  target_date: string | null
  color: string
  icon: string
  archived: boolean
  linked_investment_id: string | null
  created_at: string
}

export interface SavingsGoalContribution {
  id: string
  goal_id: string
  user_id: string
  amount: number
  date: string
  notes: string | null
  created_at: string
}

export type AgendaEventCategory = 'trabalho' | 'pessoal' | 'outro'

export interface AgendaEvent {
  id: string
  user_id: string
  title: string
  event_date: string
  event_time: string | null
  notes: string | null
  done: boolean
  google_event_id: string | null
  category: AgendaEventCategory
  created_at: string
  updated_at: string
}

export interface GoogleCalendarConnection {
  user_id: string
  calendar_id: string
  connected_at: string
  last_synced_at: string | null
}

export interface WhatsappLink {
  user_id: string
  phone_number: string
  created_at: string
}
