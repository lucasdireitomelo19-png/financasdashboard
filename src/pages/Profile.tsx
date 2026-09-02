import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { ErrorText, FormField, PrimaryButton, TextInput } from '../components/FormField'
import { triggerSaveFeedback } from '../lib/feedback'

export function Profile() {
  const { user, updateDisplayName } = useAuth()
  const [name, setName] = useState((user?.user_metadata?.display_name as string | undefined) ?? '')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    if (!name.trim()) {
      setError('Informe um nome.')
      return
    }
    setSaving(true)
    const result = await updateDisplayName(name.trim())
    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setSuccess(true)
    triggerSaveFeedback()
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-lg font-bold uppercase tracking-wider text-cyan-100">Meu perfil</h1>
      <p className="text-sm text-slate-400">Dê um nome à sua conta — ele aparece na saudação da tela inicial.</p>

      <div className="hud-panel p-4">
        <form onSubmit={handleSubmit}>
          <ErrorText>{error}</ErrorText>
          {success && (
            <p className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">Nome salvo com sucesso.</p>
          )}

          <FormField label="Nome">
            <TextInput type="text" required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Como quer ser chamado?" maxLength={60} />
          </FormField>

          <FormField label="E-mail">
            <TextInput type="email" value={user?.email ?? ''} disabled className="opacity-60" />
          </FormField>

          <div className="mt-4">
            <PrimaryButton type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  )
}
