import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'

interface Command {
  id: string
  label: string
  icon: string
  hint?: string
  action: (navigate: ReturnType<typeof useNavigate>) => void
}

const COMMANDS: Command[] = [
  { id: 'new-expense', label: 'Novo gasto', icon: '💸', hint: 'lançar', action: (nav) => nav('/lancamentos?new=expense') },
  { id: 'new-income', label: 'Nova entrada', icon: '💰', hint: 'lançar', action: (nav) => nav('/lancamentos?new=income') },
  { id: 'go-home', label: 'Início', icon: '🏠', hint: 'ir para', action: (nav) => nav('/') },
  { id: 'go-tx', label: 'Lançamentos', icon: '📋', hint: 'ir para', action: (nav) => nav('/lancamentos') },
  { id: 'go-recurring', label: 'Recorrentes', icon: '🔁', hint: 'ir para', action: (nav) => nav('/recorrentes') },
  { id: 'go-accounts', label: 'Contas', icon: '💳', hint: 'ir para', action: (nav) => nav('/contas') },
  { id: 'go-investments', label: 'Investimentos', icon: '📈', hint: 'ir para', action: (nav) => nav('/investimentos') },
  { id: 'go-categories', label: 'Categorias', icon: '🏷️', hint: 'ir para', action: (nav) => nav('/categorias') },
]

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // permite abrir programaticamente (ex: botão flutuante no mobile, sem atalho de teclado)
  useEffect(() => {
    const openHandler = () => setOpen(true)
    window.addEventListener('open-command-palette', openHandler)
    return () => window.removeEventListener('open-command-palette', openHandler)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      window.setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const filtered = useMemo(() => {
    const q = normalize(query.trim())
    if (!q) return COMMANDS
    return COMMANDS.filter((c) => normalize(c.label).includes(q))
  }, [query])

  const searchFallback = query.trim().length > 0

  const runCommand = (cmd: Command) => {
    cmd.action(navigate)
    setOpen(false)
  }

  const runSearch = () => {
    navigate(`/lancamentos?q=${encodeURIComponent(query.trim())}`)
    setOpen(false)
  }

  const totalOptions = filtered.length + (searchFallback ? 1 : 0)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((s) => Math.min(totalOptions - 1, s + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((s) => Math.max(0, s - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selected < filtered.length) runCommand(filtered[selected])
      else if (searchFallback) runSearch()
    }
  }

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-start justify-center bg-black/70 p-4 pt-[12vh] backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="hud-panel w-full max-w-lg overflow-hidden p-0" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-cyan-500/15 px-4 py-3">
          <span className="text-cyan-400">⌘</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelected(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Digite um comando ou busque um lançamento..."
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          <kbd className="rounded border border-cyan-500/20 px-1.5 py-0.5 font-display text-[10px] text-slate-500">ESC</kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {filtered.length === 0 && !searchFallback && <p className="px-3 py-4 text-center text-sm text-slate-500">Nenhum comando encontrado.</p>}

          {filtered.map((cmd, i) => (
            <button
              key={cmd.id}
              onClick={() => runCommand(cmd)}
              onMouseEnter={() => setSelected(i)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                selected === i ? 'bg-cyan-400/15 text-cyan-100' : 'text-slate-300 hover:bg-cyan-500/5'
              }`}
            >
              <span className="text-lg">{cmd.icon}</span>
              <span className="flex-1 text-sm">{cmd.label}</span>
              {cmd.hint && <span className="font-display text-[10px] uppercase tracking-wider text-slate-600">{cmd.hint}</span>}
            </button>
          ))}

          {searchFallback && (
            <button
              onClick={runSearch}
              onMouseEnter={() => setSelected(filtered.length)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                selected === filtered.length ? 'bg-cyan-400/15 text-cyan-100' : 'text-slate-300 hover:bg-cyan-500/5'
              }`}
            >
              <span className="text-lg">🔎</span>
              <span className="flex-1 text-sm">
                Buscar lançamentos por "<span className="text-cyan-300">{query.trim()}</span>"
              </span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
