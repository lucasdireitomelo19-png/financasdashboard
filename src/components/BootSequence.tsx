import { useEffect, useRef, useState } from 'react'
import { ArcReactor } from './ArcReactor'

const BOOT_LINES = ['INICIALIZANDO SISTEMA FINANCEIRO', 'CARREGANDO MÓDULOS DE DADOS', 'SINCRONIZANDO CONTAS', 'PRONTO']

const MIN_DURATION_MS = 1400

/** Tela de "boot" estilo HUD exibida uma vez por login. Respeita
 * prefers-reduced-motion pulando direto para onDone.
 *
 * Usa setInterval/setTimeout (não requestAnimationFrame) porque rAF pode
 * ficar pausado indefinidamente numa aba em segundo plano/inativa,
 * travando a tela pra sempre — já aconteceu num PC real. */
export function BootSequence({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0)
  const [lineIndex, setLineIndex] = useState(0)
  const doneRef = useRef(false)

  useEffect(() => {
    const finish = () => {
      if (doneRef.current) return
      doneRef.current = true
      onDone()
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish()
      return
    }

    const start = Date.now()
    const interval = window.setInterval(() => {
      const elapsed = Date.now() - start
      const pct = Math.min(100, (elapsed / MIN_DURATION_MS) * 100)
      setProgress(pct)
      setLineIndex(Math.min(BOOT_LINES.length - 1, Math.floor((pct / 100) * BOOT_LINES.length)))
    }, 60)

    const timeout = window.setTimeout(() => {
      setProgress(100)
      finish()
    }, MIN_DURATION_MS)

    // segurança extra: se por algum motivo o timer principal falhar, garante
    // que a tela nunca trava o app pra sempre
    const safety = window.setTimeout(finish, MIN_DURATION_MS + 2000)

    return () => {
      window.clearInterval(interval)
      window.clearTimeout(timeout)
      window.clearTimeout(safety)
    }
    // roda uma única vez no mount — onDone fecha sobre um setState estável,
    // não precisa (nem deve) reiniciar o timer a cada re-render do pai
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-[var(--color-hud-bg)] px-6">
      <ArcReactor size={72} />
      <div className="w-full max-w-xs text-center">
        <p className="font-display text-[11px] uppercase tracking-[0.3em] text-cyan-300/80">{BOOT_LINES[lineIndex]}</p>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#0a1120]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-300 transition-[width] duration-150 ease-linear"
            style={{ width: `${progress}%`, boxShadow: '0 0 10px color-mix(in srgb, var(--color-accent) 80%, transparent)' }}
          />
        </div>
        <p className="mt-2 font-display text-[10px] tracking-[0.2em] text-slate-500">{Math.round(progress)}%</p>
      </div>
    </div>
  )
}
