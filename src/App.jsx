import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ToastProvider } from './hooks/useToast'
import LoginPage from './components/auth/LoginPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import AppLayout from './components/layout/AppLayout'
import Dashboard from './pages/Dashboard'
import EquipmentList from './pages/EquipmentList'
import CalendarView from './pages/CalendarView'
import MyBookings from './pages/MyBookings'
import ApprovalQueue from './pages/ApprovalQueue'
import AdminEquipment from './pages/admin/AdminEquipment'
import AdminBookings from './pages/admin/AdminBookings'
import AdminUsers from './pages/admin/AdminUsers'
import AccountPage from './pages/AccountPage'
import CSVImport from './pages/admin/CSVImport'
import PasswordResets from './pages/admin/PasswordResets'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div className="spinner" style={{ width: 40, height: 40 }} />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}

function RequireRole({ children, role }) {
  const { profile, loading } = useAuth()
  if (loading) return null
  const roleOrder = { viewer: 0, approver: 1, admin: 2 }
  if ((roleOrder[profile?.role] || 0) < (roleOrder[role] || 0)) return <Navigate to="/dashboard" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/equipment" element={<EquipmentList />} />
        <Route path="/calendar" element={<CalendarView />} />
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/approvals" element={<RequireRole role="approver"><ApprovalQueue /></RequireRole>} />
        <Route path="/admin/equipment" element={<RequireRole role="admin"><AdminEquipment /></RequireRole>} />
        <Route path="/admin/bookings" element={<RequireRole role="admin"><AdminBookings /></RequireRole>} />
        <Route path="/admin/users" element={<RequireRole role="admin"><AdminUsers /></RequireRole>} />
        <Route path="/admin/import" element={<RequireRole role="admin"><CSVImport /></RequireRole>} />
        <Route path="/admin/password-resets" element={<RequireRole role="admin"><PasswordResets /></RequireRole>} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
