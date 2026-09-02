import { useTheme, THEMES } from '../context/ThemeContext'
import { triggerSaveFeedback } from '../lib/feedback'

export function Settings() {
  const { theme, setTheme } = useTheme()

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
    </div>
  )
}
