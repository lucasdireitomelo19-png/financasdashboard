import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { DEFAULT_CATEGORIES } from '../lib/constants'

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function ensureDefaultCategories(userId: string) {
  const { count } = await supabase
    .from('categories')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (count && count > 0) return

  const rows = DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: userId, is_default: true }))
  await supabase.from('categories').insert(rows)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession?.user) {
        void ensureDefaultCategories(newSession.user.id)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? traduzErro(error.message) : null }
  }

  const signUp: AuthContextValue['signUp'] = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (!error && data.user) {
      await ensureDefaultCategories(data.user.id)
    }
    return { error: error ? traduzErro(error.message) : null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

function traduzErro(message: string): string {
  if (message.includes('Invalid login credentials')) return 'E-mail ou senha inválidos.'
  if (message.includes('User already registered')) return 'Este e-mail já está cadastrado.'
  if (message.includes('Password should be at least')) return 'A senha deve ter pelo menos 6 caracteres.'
  if (message.includes('Unable to validate email address')) return 'E-mail inválido.'
  return message
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
