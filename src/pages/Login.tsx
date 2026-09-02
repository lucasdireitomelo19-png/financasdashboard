import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { ErrorText, PrimaryButton, TextInput } from '../components/FormField'
import { isSupabaseConfigured } from '../lib/supabase'

export function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)
    const result = mode === 'signin' ? await signIn(email, password) : await signUp(email, password)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else if (mode === 'signup') {
      setInfo('Conta criada! Se a confirmação por e-mail estiver ativada no seu projeto Supabase, verifique sua caixa de entrada antes de entrar.')
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-2 text-4xl">💰</div>
          <h1 className="text-xl font-semibold text-slate-100">Finanças Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">Sua vida financeira em um só lugar</p>
        </div>

        {!isSupabaseConfigured && (
          <p className="mb-4 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
            Supabase ainda não configurado neste ambiente. Crie um arquivo <code>.env</code> com suas chaves (veja{' '}
            <code>.env.example</code> e o README) para poder entrar.
          </p>
        )}

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <ErrorText>{error}</ErrorText>
          {info && <p className="mb-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">{info}</p>}

          <label className="mb-3 block">
            <span className="mb-1 block text-sm font-medium text-slate-300">E-mail</span>
            <TextInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" autoComplete="email" />
          </label>

          <label className="mb-4 block">
            <span className="mb-1 block text-sm font-medium text-slate-300">Senha</span>
            <TextInput
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </label>

          <PrimaryButton type="submit" disabled={loading}>
            {loading ? 'Aguarde...' : mode === 'signin' ? 'Entrar' : 'Criar conta'}
          </PrimaryButton>

          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              setError(null)
              setInfo(null)
            }}
            className="mt-4 w-full text-center text-sm text-slate-400 hover:text-emerald-400"
          >
            {mode === 'signin' ? 'Não tem conta? Criar agora' : 'Já tem conta? Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
