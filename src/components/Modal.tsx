import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Trava o scroll do fundo da página enquanto o modal está aberto.
  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [])

  // Garante que o campo focado fique visível acima do teclado no mobile.
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
  // próprio), o que fazia a barra de navegação inferior do mobile sobrepor
  // o rodapé do modal e esconder o botão Salvar.
  //
  // Importante: quem rola é o CONTAINER DE FORA (fixed + overflow-y-auto),
  // não um painel interno de altura travada. Isso evita todo o problema de
  // calcular "altura visível" quando o teclado do iOS abre/fecha — o painel
  // simplesmente cresce o quanto precisar, e o fundo rola até o fim dele,
  // então o botão Salvar sempre fica alcançável.
  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain bg-black/70 backdrop-blur-sm">
      <div className="flex min-h-full items-end justify-center sm:items-center sm:p-4">
        <div
          ref={panelRef}
          className="hud-panel w-full rounded-t-2xl p-5 sm:my-8 sm:max-w-lg sm:rounded-2xl"
          style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
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
      </div>
    </div>,
    document.body,
  )
}
