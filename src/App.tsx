import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { Layout } from './components/Layout'
import { LoadingReactor } from './components/LoadingReactor'
import { BootSequence } from './components/BootSequence'
import { Login } from './pages/Login'
import { ResetPassword } from './pages/ResetPassword'
import { Dashboard } from './pages/Dashboard'
import { Transactions } from './pages/Transactions'
import { Recurring } from './pages/Recurring'
import { Investments } from './pages/Investments'
import { Categories } from './pages/Categories'
import { Accounts } from './pages/Accounts'
import { Settings } from './pages/Settings'
import { Profile } from './pages/Profile'
import { Agenda } from './pages/Agenda'

function AppRoutes() {
  const { session, loading, passwordRecovery } = useAuth()
  const [booted, setBooted] = useState(false)
  const bootedForUser = useRef<string | null>(null)

  console.log('[BOOT DEBUG] AppRoutes render — loading=', loading, 'session?', !!session, 'userId=', session?.user?.id, 'booted=', booted)

  useEffect(() => {
    console.log('[BOOT DEBUG] session-effect ran — session?', !!session, 'userId=', session?.user?.id, 'bootedForUser.current=', bootedForUser.current)
    if (session && bootedForUser.current !== session.user.id) {
      console.log('[BOOT DEBUG] session-effect calling setBooted(false)')
      bootedForUser.current = session.user.id
      setBooted(false)
    }
  }, [session])

  if (loading) {
    return <LoadingReactor />
  }

  // Vem do link de recuperação de senha por e-mail: mostra a tela de nova
  // senha independente de já existir uma sessão (o Supabase cria uma sessão
  // temporária de recuperação ao clicar no link).
  if (passwordRecovery) {
    return (
      <Routes>
        <Route path="*" element={<ResetPassword />} />
      </Routes>
    )
  }

  if (!session) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    )
  }

  if (!booted) {
    return <BootSequence onDone={() => setBooted(true)} />
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/lancamentos" element={<Transactions />} />
        <Route path="/recorrentes" element={<Recurring />} />
        <Route path="/contas" element={<Accounts />} />
        <Route path="/investimentos" element={<Investments />} />
        <Route path="/categorias" element={<Categories />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/configuracoes" element={<Settings />} />
        <Route path="/perfil" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
