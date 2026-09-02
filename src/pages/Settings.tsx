import { useState } from 'react'
import { useTheme, THEMES } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useWhatsappLink } from '../hooks/useWhatsappLink'
import { TextInput } from '../components/FormField'
import { triggerSaveFeedback } from '../lib/feedback'

export function Settings() {
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()
  const { link, loading, save, remove } = useWhatsappLink(user?.id)
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 12) {
      setError('Informe o número completo com DDI e DDD, só números (ex: 5511999998888).')
      return
    }
    setError(null)
    setSaving(true)
    const result = await save(digits)
    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setPhone('')
    triggerSaveFeedback()
  }

  const handleRemove = async () => {
    if (!confirm('Desvincular esse número? Mensagens dele deixam de registrar gastos automaticamente.')) return
    await remove()
    triggerSaveFeedback()
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-lg font-bold uppercase tracking-wider text-cyan-100">Configurações</h1>
      <p className="text-sm text-slate-400">Escolha o esquema de cores do app. A mesma pegada, em outra cor.</p>

      <div className="hud-panel p-4">
        <h2 className="mb-3 font-display text-xs font-semibold uppercase tracking-wider text-cyan-300/70">Esquema de cores</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {THEMES.map((t) => {
            const active = theme === t.id
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id)
                  triggerSaveFeedback()
                }}
                className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                  active
                    ? 'border-cyan-400/50 bg-cyan-400/10 shadow-[0_0_18px_-6px_color-mix(in_srgb,var(--color-accent)_70%,transparent)]'
                    : 'border-cyan-500/15 hover:border-cyan-500/30 hover:bg-cyan-500/5'
                }`}
              >
                <span
                  className="h-9 w-9 shrink-0 rounded-full"
                  style={{ background: t.swatch, boxShadow: `0 0 16px -2px ${t.swatch}` }}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-200">{t.label}</span>
                  <span className="block text-xs text-slate-500">{active ? 'Selecionado' : 'Toque para aplicar'}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="hud-panel p-4">
        <h2 className="mb-1 font-display text-xs font-semibold uppercase tracking-wider text-cyan-300/70">📱 WhatsApp</h2>
        <p className="mb-3 text-xs text-slate-500">
          Vincule seu número pra registrar gastos e entradas mandando mensagem, tipo <span className="text-slate-400">"gastei 50 no mercado"</span> ou{' '}
          <span className="text-slate-400">"recebi 200 de freelance"</span>.
        </p>

        {loading ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : link ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-emerald-300">✅ Vinculado: +{link.phone_number}</p>
            <button onClick={() => void handleRemove()} className="rounded-lg border border-rose-500/20 px-3 py-2 font-display text-xs font-medium uppercase tracking-wider text-rose-400 hover:bg-rose-500/10">
              Desvincular
            </button>
          </div>
        ) : (
          <div>
            {error && <p className="mb-2 text-xs text-rose-400">{error}</p>}
            <div className="flex flex-col gap-2 sm:flex-row">
              <TextInput
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: 5511999998888 (DDI+DDD+número)"
                className="flex-1"
              />
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="shrink-0 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-400 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-[#031018] shadow-[0_0_20px_-4px_color-mix(in_srgb,var(--color-accent)_80%,transparent)] transition hover:from-cyan-400 hover:to-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Vincular'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
