import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { to: '/', label: 'Início', icon: '🏠', end: true },
  { to: '/lancamentos', label: 'Lançamentos', icon: '📋', end: false },
  { to: '/recorrentes', label: 'Recorrentes', icon: '🔁', end: false },
  { to: '/investimentos', label: 'Investir', icon: '📈', end: false },
  { to: '/categorias', label: 'Categorias', icon: '🏷️', end: false },
]

export function Layout() {
  const { user, signOut } = useAuth()

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col sm:flex-row">
      {/* nav lateral no desktop */}
      <aside className="hidden w-56 shrink-0 border-r border-slate-800 p-4 sm:flex sm:flex-col">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="text-2xl">💰</span>
          <span className="font-semibold text-slate-100">Finanças</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-emerald-600/15 text-emerald-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-800 pt-3 text-xs text-slate-500">
          <p className="mb-2 truncate">{user?.email}</p>
          <button onClick={() => void signOut()} className="text-slate-400 hover:text-red-400">
            Sair
          </button>
        </div>
      </aside>

      {/* topo no mobile */}
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3 sm:hidden">
        <div className="flex items-center gap-2">
          <span className="text-xl">💰</span>
          <span className="font-semibold text-slate-100">Finanças</span>
        </div>
        <button onClick={() => void signOut()} className="text-sm text-slate-400 hover:text-red-400">
          Sair
        </button>
      </header>

      <main className="flex-1 overflow-x-hidden px-4 pb-24 pt-4 sm:px-6 sm:pb-8 sm:pt-6">
        <Outlet />
      </main>

      {/* nav inferior no mobile */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-800 bg-slate-950/95 backdrop-blur sm:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                isActive ? 'text-emerald-400' : 'text-slate-500'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
