import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Layout } from './components/Layout'
import { LoadingReactor } from './components/LoadingReactor'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Transactions } from './pages/Transactions'
import { Recurring } from './pages/Recurring'
import { Investments } from './pages/Investments'
import { Categories } from './pages/Categories'
import { Accounts } from './pages/Accounts'

function AppRoutes() {
  const { session, loading } = useAuth()

  if (loading) {
    return <LoadingReactor />
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
