import { createClient } from '@supabase/supabase-js'

// Observação: não usamos o generic <Database> do createClient aqui — a tipagem
// das tabelas do supabase-js exige um formato bem específico (GenericSchema)
// que adiciona complexidade sem trazer benefício real neste projeto. Os tipos
// de domínio (Category, Transaction, Investment, etc. em ../types/database)
// são usados diretamente nos hooks para manter a tipagem forte onde importa.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    'Supabase não configurado. Crie um arquivo .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (veja .env.example).',
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  },
)
