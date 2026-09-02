import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Layout } from './components/Layout'
import { LoadingReactor } from './components/LoadingReactor'
import { Login } from './pages/Login'
import { ResetPassword } from './pages/ResetPassword'
import { Dashboard } from './pages/Dashboard'
import { Transactions } from './pages/Transactions'
import { Recurring } from './pages/Recurring'
import { Investments } from './pages/Investments'
import { Categories } from './pages/Categories'
import { Accounts } from './pages/Accounts'

function AppRoutes() {
  const { session, loading, passwordRecovery } = useAuth()

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

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/lancamentos" element={<Transactions />} />
        <Route path="/recorrentes" element={<Recurring />} />
        <Route path="/contas" element={<Accounts />} />
        <Route path="/investimentos" element={<Investments />} />
        <Route path="/categorias" element={<Categories />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
