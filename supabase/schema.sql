-- ============================================================================
-- Finanças Dashboard — schema do banco (Supabase / Postgres)
-- ============================================================================
-- Como usar: abra o SQL Editor do seu projeto Supabase e rode este arquivo
-- inteiro de uma vez. Ele é seguro para rodar novamente (usa IF NOT EXISTS /
-- CREATE OR REPLACE em tudo que for possível).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- categories: categorias de gasto/entrada, personalizáveis por usuário
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('expense', 'income')),
  color text not null default '#64748b',
  icon text not null default '💰',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name, type)
);

alter table public.categories enable row level security;

drop policy if exists "categories_select_own" on public.categories;
create policy "categories_select_own" on public.categories
  for select using (auth.uid() = user_id);

drop policy if exists "categories_insert_own" on public.categories;
create policy "categories_insert_own" on public.categories
  for insert with check (auth.uid() = user_id);

drop policy if exists "categories_update_own" on public.categories;
create policy "categories_update_own" on public.categories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "categories_delete_own" on public.categories;
create policy "categories_delete_own" on public.categories
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- payment_accounts: cartões de crédito e benefícios tipo VR/VA. Cada um tem
-- sua própria lógica de ciclo (fatura do cartão / crédito mensal do vale).
-- ----------------------------------------------------------------------------
create table if not exists public.payment_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('cartao_credito', 'vale')),
  color text not null default '#22e0ff',
  icon text not null default '💳',
  -- cartão de crédito
  closing_day int check (closing_day between 1 and 28),
  due_day int check (due_day between 1 and 28),
  -- vale (VR/VA)
  monthly_credit numeric(12, 2),
  credit_day int check (credit_day between 1 and 28),
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.payment_accounts enable row level security;

drop policy if exists "payment_accounts_select_own" on public.payment_accounts;
create policy "payment_accounts_select_own" on public.payment_accounts
  for select using (auth.uid() = user_id);

drop policy if exists "payment_accounts_insert_own" on public.payment_accounts;
create policy "payment_accounts_insert_own" on public.payment_accounts
  for insert with check (auth.uid() = user_id);

drop policy if exists "payment_accounts_update_own" on public.payment_accounts;
create policy "payment_accounts_update_own" on public.payment_accounts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "payment_accounts_delete_own" on public.payment_accounts;
create policy "payment_accounts_delete_own" on public.payment_accounts
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- recurring_templates: modelos de gastos/entradas recorrentes de valor fixo
-- (aluguel, salário, assinaturas, etc). O app gera as transações reais a
-- partir daqui automaticamente.
-- ----------------------------------------------------------------------------
create table if not exists public.recurring_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('expense', 'income')),
  amount numeric(12, 2) not null check (amount > 0),
  category_id uuid references public.categories(id) on delete set null,
  description text not null,
  frequency text not null check (frequency in ('weekly', 'monthly', 'yearly')),
  day_of_month int check (day_of_month between 1 and 31),
  day_of_week int check (day_of_week between 0 and 6),
  start_date date not null,
  end_date date,
  active boolean not null default true,
  payment_method text,
  account_id uuid references public.payment_accounts(id) on delete set null,
  last_generated_date date,
  created_at timestamptz not null default now()
);

alter table public.recurring_templates add column if not exists account_id uuid references public.payment_accounts(id) on delete set null;

alter table public.recurring_templates enable row level security;

drop policy if exists "recurring_select_own" on public.recurring_templates;
create policy "recurring_select_own" on public.recurring_templates
  for select using (auth.uid() = user_id);

drop policy if exists "recurring_insert_own" on public.recurring_templates;
create policy "recurring_insert_own" on public.recurring_templates
  for insert with check (auth.uid() = user_id);

drop policy if exists "recurring_update_own" on public.recurring_templates;
create policy "recurring_update_own" on public.recurring_templates
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "recurring_delete_own" on public.recurring_templates;
create policy "recurring_delete_own" on public.recurring_templates
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- transactions: todos os lançamentos (gastos e entradas), incluindo
-- instâncias geradas por um template recorrente e entradas/gastos variáveis
-- ----------------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('expense', 'income')),
  amount numeric(12, 2) not null check (amount > 0),
  category_id uuid references public.categories(id) on delete set null,
  description text not null default '',
  date date not null,
  payment_method text,
  is_variable boolean not null default false,
  recurring_template_id uuid references public.recurring_templates(id) on delete set null,
  account_id uuid references public.payment_accounts(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

-- garante a coluna em bancos que já tinham a tabela transactions antes desta
-- versão do schema (rodar este arquivo de novo é seguro)
alter table public.transactions add column if not exists account_id uuid references public.payment_accounts(id) on delete set null;

create index if not exists transactions_user_date_idx on public.transactions (user_id, date desc);
create index if not exists transactions_user_type_idx on public.transactions (user_id, type);
create index if not exists transactions_user_category_idx on public.transactions (user_id, category_id);
create index if not exists transactions_user_account_idx on public.transactions (user_id, account_id);

alter table public.transactions enable row level security;

drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own" on public.transactions
  for select using (auth.uid() = user_id);

drop policy if exists "transactions_insert_own" on public.transactions;
create policy "transactions_insert_own" on public.transactions
  for insert with check (auth.uid() = user_id);

drop policy if exists "transactions_update_own" on public.transactions;
create policy "transactions_update_own" on public.transactions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "transactions_delete_own" on public.transactions;
create policy "transactions_delete_own" on public.transactions
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- investments: cada "posição" (ex: Tesouro Selic, ações XPTO, fundo Y)
-- ----------------------------------------------------------------------------
create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null check (
    category in ('renda_fixa', 'acoes', 'fundos', 'fiis', 'cripto', 'previdencia', 'tesouro', 'reserva_emergencia', 'outros')
  ),
  institution text,
  date_invested date not null default current_date,
  notes text,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.investments enable row level security;

drop policy if exists "investments_select_own" on public.investments;
create policy "investments_select_own" on public.investments
  for select using (auth.uid() = user_id);

drop policy if exists "investments_insert_own" on public.investments;
create policy "investments_insert_own" on public.investments
  for insert with check (auth.uid() = user_id);

drop policy if exists "investments_update_own" on public.investments;
create policy "investments_update_own" on public.investments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "investments_delete_own" on public.investments;
create policy "investments_delete_own" on public.investments
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- investment_movements: aportes, resgates, rendimentos e ajustes de valor
-- ----------------------------------------------------------------------------
create table if not exists public.investment_movements (
  id uuid primary key default gen_random_uuid(),
  investment_id uuid not null references public.investments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('aporte', 'resgate', 'rendimento', 'ajuste')),
  amount numeric(12, 2) not null,
  date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists investment_movements_investment_idx on public.investment_movements (investment_id, date desc);

alter table public.investment_movements enable row level security;

drop policy if exists "investment_movements_select_own" on public.investment_movements;
create policy "investment_movements_select_own" on public.investment_movements
  for select using (auth.uid() = user_id);

drop policy if exists "investment_movements_insert_own" on public.investment_movements;
create policy "investment_movements_insert_own" on public.investment_movements
  for insert with check (auth.uid() = user_id);

drop policy if exists "investment_movements_update_own" on public.investment_movements;
create policy "investment_movements_update_own" on public.investment_movements
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "investment_movements_delete_own" on public.investment_movements;
create policy "investment_movements_delete_own" on public.investment_movements
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- investor_profiles: resultado do questionário de perfil de investidor
-- (uma linha por usuário). Usado só para sugerir uma alocação-alvo
-- educacional — não é recomendação de investimento individualizada.
-- ----------------------------------------------------------------------------
create table if not exists public.investor_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  risk_profile text not null check (risk_profile in ('conservador', 'moderado', 'arrojado')),
  score int not null,
  answers jsonb,
  updated_at timestamptz not null default now()
);

alter table public.investor_profiles enable row level security;

drop policy if exists "investor_profiles_select_own" on public.investor_profiles;
create policy "investor_profiles_select_own" on public.investor_profiles
  for select using (auth.uid() = user_id);

drop policy if exists "investor_profiles_insert_own" on public.investor_profiles;
create policy "investor_profiles_insert_own" on public.investor_profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "investor_profiles_update_own" on public.investor_profiles;
create policy "investor_profiles_update_own" on public.investor_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "investor_profiles_delete_own" on public.investor_profiles;
create policy "investor_profiles_delete_own" on public.investor_profiles
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- credit_card_bill_payments: marca se a fatura de um determinado ciclo
-- (identificado por "YYYY-MM", o mês em que ela fecha) já foi paga.
-- ----------------------------------------------------------------------------
create table if not exists public.credit_card_bill_payments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.payment_accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_key text not null,
  paid boolean not null default true,
  paid_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (account_id, cycle_key)
);

alter table public.credit_card_bill_payments enable row level security;

drop policy if exists "bill_payments_select_own" on public.credit_card_bill_payments;
create policy "bill_payments_select_own" on public.credit_card_bill_payments
  for select using (auth.uid() = user_id);

drop policy if exists "bill_payments_insert_own" on public.credit_card_bill_payments;
create policy "bill_payments_insert_own" on public.credit_card_bill_payments
  for insert with check (auth.uid() = user_id);

drop policy if exists "bill_payments_update_own" on public.credit_card_bill_payments;
create policy "bill_payments_update_own" on public.credit_card_bill_payments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "bill_payments_delete_own" on public.credit_card_bill_payments;
create policy "bill_payments_delete_own" on public.credit_card_bill_payments
  for delete using (auth.uid() = user_id);

-- ============================================================================
-- Fim do schema.
-- ============================================================================
