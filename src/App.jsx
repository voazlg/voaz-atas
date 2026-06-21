import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { Header } from './components/Header'
import Login from './pages/Login'
import Obras from './pages/Obras'
import Ata from './pages/Ata'
import Dashboard from './pages/Dashboard'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ padding: 40, color: '#6b7280' }}>Carregando...</div>
  if (!user) return <Navigate to="/login" replace />
  return (
    <>
      <Header />
      {children}
    </>
  )
}

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return null
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/obras" replace /> : <Login />} />
      <Route path="/obras" element={<PrivateRoute><Obras /></PrivateRoute>} />
      <Route path="/ata/:obraId/:tipo" element={<PrivateRoute><Ata /></PrivateRoute>} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="*" element={<Navigate to={user ? '/obras' : '/login'} replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
