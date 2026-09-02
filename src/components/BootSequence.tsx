import { useEffect, useState } from 'react'
import { ArcReactor } from './ArcReactor'

const BOOT_LINES = ['INICIALIZANDO SISTEMA FINANCEIRO', 'CARREGANDO MÓDULOS DE DADOS', 'SINCRONIZANDO CONTAS', 'PRONTO']

const MIN_DURATION_MS = 1400

/** Tela de "boot" estilo HUD exibida uma vez por login. Respeita
 * prefers-reduced-motion pulando direto para onDone. */
export function BootSequence({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0)
  const [lineIndex, setLineIndex] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onDone()
      return
    }

    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const elapsed = now - start
      const pct = Math.min(100, (elapsed / MIN_DURATION_MS) * 100)
      setProgress(pct)
      setLineIndex(Math.min(BOOT_LINES.length - 1, Math.floor((pct / 100) * BOOT_LINES.length)))
      if (elapsed < MIN_DURATION_MS) {
        raf = requestAnimationFrame(tick)
      } else {
        onDone()
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
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
            style={{ width: `${progress}%`, boxShadow: '0 0 10px rgba(34,224,255,0.8)' }}
          />
        </div>
        <p className="mt-2 font-display text-[10px] tracking-[0.2em] text-slate-500">{Math.round(progress)}%</p>
      </div>
    </div>
  )
}
