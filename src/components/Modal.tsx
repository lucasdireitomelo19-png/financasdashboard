import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [maxHeight, setMaxHeight] = useState<string>('92dvh')

  // No iOS/mobile, quando o teclado abre, um elemento "fixed" com altura em
  // dvh não encolhe corretamente — o rodapé do modal (ex: botão Salvar) fica
  // escondido atrás do teclado e sem como rolar até ele. A Visual Viewport
  // API reporta a altura real visível (já descontando o teclado), então
  // usamos ela para recalcular a altura máxima do painel.
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const update = () => setMaxHeight(`${Math.round(vv.height * 0.94)}px`)
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  // Trava o scroll do fundo da página enquanto o modal está aberto — evita
  // que o gesto de rolar dentro do modal "vaze" pra página por trás no iOS.
  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [])

  // Garante que o campo focado (e o que vem depois dele) fique visível
  // acima do teclado, mesmo se o navegador não fizer isso sozinho.
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      if (!['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return
      window.setTimeout(() => {
        target.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }, 300)
    }

    panel.addEventListener('focusin', handleFocusIn)
    return () => panel.removeEventListener('focusin', handleFocusIn)
  }, [])

  // Renderizado via portal direto no <body>: assim o modal nunca fica preso
  // dentro do stacking context de algum ancestral (ex: o <main> com z-index
  // próprio), o que antes fazia a barra de navegação inferior do mobile
  // sobrepor o rodapé do modal e esconder o botão Salvar.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        ref={panelRef}
        className="hud-panel w-full overflow-y-auto overscroll-contain rounded-t-2xl p-5 sm:max-w-lg sm:rounded-2xl"
        style={{ maxHeight, paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-cyan-100">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full border border-cyan-500/20 p-1.5 text-cyan-300/70 hover:border-cyan-400/50 hover:text-cyan-200"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
