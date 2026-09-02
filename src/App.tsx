import { useState } from 'react'
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
  // id do usuário que já completou a sequência de boot nesta sessão do
  // navegador. Só é alterado pelo próprio onDone do BootSequence — evita a
  // corrida que existia antes entre dois efeitos separados mexendo no
  // mesmo estado (um dizia "pronto" e o outro "reseta" ao mesmo tempo,
  // travando a tela pra sempre quando "reduzir movimento" está ativado).
  const [bootedUserId, setBootedUserId] = useState<string | null>(null)

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

  if (bootedUserId !== session.user.id) {
    return <BootSequence onDone={() => setBootedUserId(session.user.id)} />
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
