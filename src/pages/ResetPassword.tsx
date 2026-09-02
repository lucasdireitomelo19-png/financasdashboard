import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { ErrorText, FormField, PrimaryButton, TextInput } from '../components/FormField'
import { ArcReactor } from '../components/ArcReactor'

export function ResetPassword() {
  const { updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('As senhas não são iguais.')
      return
    }
    setLoading(true)
    const result = await updatePassword(password)
    setLoading(false)
    if (result.error) setError(result.error)
    else setDone(true)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3">
            <ArcReactor size={52} />
          </div>
          <h1 className="font-display text-lg font-bold uppercase tracking-[0.15em] text-cyan-100">Nova senha</h1>
          <p className="mt-1 text-sm text-slate-400">Defina uma nova senha para sua conta</p>
        </div>

        <div className="hud-panel p-5">
          {done ? (
            <>
              <p className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                Senha atualizada com sucesso.
              </p>
              <PrimaryButton type="button" onClick={() => window.location.replace('/')}>
                Ir para o app
              </PrimaryButton>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <ErrorText>{error}</ErrorText>

              <FormField label="Nova senha">
                <TextInput
                  type="password"
                  required
                  minLength={6}
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </FormField>

              <div className="mb-4">
                <FormField label="Confirmar nova senha">
                  <TextInput
                    type="password"
                    required
                    minLength={6}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </FormField>
              </div>

              <PrimaryButton type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar nova senha'}
              </PrimaryButton>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
