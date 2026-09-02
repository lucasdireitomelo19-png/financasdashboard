import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ArcReactor } from './ArcReactor'
import { ParticleField } from './ParticleField'
import { NotificationBell } from './NotificationBell'
import { CommandPalette } from './CommandPalette'

const NAV_ITEMS = [
  { to: '/', label: 'Início', mobileLabel: 'Início', icon: '🏠', end: true },
  { to: '/lancamentos', label: 'Lançamentos', mobileLabel: 'Extrato', icon: '📋', end: false },
  { to: '/recorrentes', label: 'Recorrentes', mobileLabel: 'Fixos', icon: '🔁', end: false },
  { to: '/contas', label: 'Contas', mobileLabel: 'Contas', icon: '💳', end: false },
  { to: '/investimentos', label: 'Investir', mobileLabel: 'Investir', icon: '📈', end: false },
  { to: '/categorias', label: 'Categorias', mobileLabel: 'Categ.', icon: '🏷️', end: false },
]

export function Layout() {
  const { user, signOut } = useAuth()

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col sm:flex-row">
      <ParticleField />
      <CommandPalette />

      {/* nav lateral no desktop */}
      <aside className="relative z-10 hidden w-60 shrink-0 border-r border-cyan-500/15 p-4 sm:flex sm:flex-col">
        <div className="mb-8 flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <ArcReactor size={30} />
            <span className="font-display text-sm font-bold uppercase tracking-[0.15em] text-cyan-100">Finanças</span>
          </div>
          <NotificationBell userId={user?.id} />
        </div>
        <button
          onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
          className="mb-4 flex items-center justify-between rounded-lg border border-cyan-500/20 bg-[#0a1120]/60 px-3 py-2 text-left text-xs text-slate-500 hover:border-cyan-400/40 hover:text-cyan-300"
        >
          <span className="flex items-center gap-2">🔎 Buscar / comandos</span>
          <kbd className="rounded border border-cyan-500/20 px-1.5 py-0.5 font-display text-[10px]">⌘K</kbd>
        </button>

        <nav className="flex flex-1 flex-col gap-1.5">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `relative flex items-center gap-2.5 rounded-lg border px-3 py-2.5 font-display text-[11px] font-medium uppercase tracking-wider transition-all ${
                  isActive
                    ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200 shadow-[0_0_18px_-6px_rgba(34,224,255,0.7)]'
                    : 'border-transparent text-slate-500 hover:border-cyan-500/20 hover:bg-cyan-500/5 hover:text-cyan-300'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded bg-cyan-400 shadow-[0_0_8px_2px_rgba(34,224,255,0.8)]" />}
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-cyan-500/15 pt-3 text-xs text-slate-500">
          <p className="mb-2 truncate font-medium">{user?.email}</p>
          <button onClick={() => void signOut()} className="font-display text-[11px] uppercase tracking-wider text-slate-500 hover:text-rose-400">
            Sair
          </button>
        </div>
      </aside>

      {/* topo no mobile */}
      <header className="relative z-10 flex items-center justify-between border-b border-cyan-500/15 px-4 py-3 sm:hidden">
        <div className="flex items-center gap-2">
          <ArcReactor size={24} />
          <span className="font-display text-sm font-bold uppercase tracking-[0.15em] text-cyan-100">Finanças</span>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell userId={user?.id} />
          <button onClick={() => void signOut()} className="font-display text-[11px] uppercase tracking-wider text-slate-500 hover:text-rose-400">
            Sair
          </button>
        </div>
      </header>

      <main className="relative z-10 flex-1 overflow-x-hidden px-4 pb-24 pt-4 sm:px-6 sm:pb-8 sm:pt-6">
        <Outlet />
      </main>

      {/* botão flutuante de comando/busca no mobile */}
      <button
        onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
        className="fixed right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-500/20 text-xl shadow-[0_0_20px_-2px_rgba(34,224,255,0.7)] backdrop-blur-xl sm:hidden"
        style={{ bottom: 'calc(4.75rem + env(safe-area-inset-bottom))' }}
        aria-label="Buscar / comandos"
      >
        🔎
      </button>

      {/* nav inferior no mobile */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-cyan-500/20 bg-[#050810]/95 backdrop-blur-xl sm:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex min-w-0 flex-1 flex-col items-center gap-0.5 px-0.5 py-2 font-display text-[8.5px] font-medium uppercase tracking-tight transition-colors ${
                isActive ? 'text-cyan-300' : 'text-slate-600'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`text-lg transition-transform ${isActive ? 'scale-110 drop-shadow-[0_0_6px_rgba(34,224,255,0.9)]' : ''}`}>{item.icon}</span>
                <span className="max-w-full truncate">{item.mobileLabel}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
