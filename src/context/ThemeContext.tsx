import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemeId = 'cyan' | 'pink' | 'red'

export const THEMES: { id: ThemeId; label: string; swatch: string }[] = [
  { id: 'cyan', label: 'Ciano (padrão)', swatch: '#22e0ff' },
  { id: 'pink', label: 'Rosa com preto', swatch: '#ff2e9a' },
  { id: 'red', label: 'Vermelho com preto', swatch: '#ff3049' },
]

const STORAGE_KEY = 'financas-theme'

interface ThemeContextValue {
  theme: ThemeId
  setTheme: (t: ThemeId) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function readStoredTheme(): ThemeId {
  if (typeof window === 'undefined') return 'cyan'
  const saved = window.localStorage.getItem(STORAGE_KEY)
  return saved === 'pink' || saved === 'red' ? saved : 'cyan'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeId>(readStoredTheme)

  useEffect(() => {
    if (theme === 'cyan') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', theme)
    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // localStorage pode estar indisponível (modo privado) — não é essencial
    }
  }, [theme])

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme deve ser usado dentro de ThemeProvider')
  return ctx
}
