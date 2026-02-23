import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  FlaskConical, Calendar, Search, ClipboardList,
  Settings, Users, LayoutDashboard, LogOut, ChevronRight
} from 'lucide-react'

export default function Layout({ children }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const isAdmin = profile?.role === 'admin'
  const isApprover = profile?.role === 'approver' || isAdmin

  const navItems = [
    { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { to: '/equipment', icon: <Search size={18} />, label: 'Browse Equipment' },
    { to: '/my-bookings', icon: <ClipboardList size={18} />, label: 'My Bookings' },
    { to: '/calendar', icon: <Calendar size={18} />, label: 'Calendar' },
  ]

  const adminItems = [
    ...(isApprover ? [{ to: '/approvals', icon: <ClipboardList size={18} />, label: 'Approvals' }] : []),
    ...(isAdmin ? [
      { to: '/admin/equipment', icon: <FlaskConical size={18} />, label: 'Manage Equipment' },
      { to: '/admin/bookings', icon: <Calendar size={18} />, label: 'All Bookings' },
      { to: '/admin/users', icon: <Users size={18} />, label: 'Users' },
    ] : []),
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 240, background: 'var(--bg-2)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 100
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, background: 'var(--accent-dim)', border: '1px solid rgba(0,212,170,0.25)',
              borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <FlaskConical size={18} color="var(--accent)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.02em' }}>LabBook</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', letterSpacing: '0.04em' }}>LILLY BOSTON</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
              borderRadius: 8, fontSize: '0.875rem', fontWeight: 500,
              textDecoration: 'none', transition: 'all 150ms',
              background: isActive ? 'var(--accent-dim)' : 'transparent',
              color: isActive ? 'var(--accent)' : 'var(--text-2)',
            })}>
              {item.icon}
              {item.label}
            </NavLink>
          ))}

          {adminItems.length > 0 && (
            <>
              <div style={{ margin: '16px 12px 8px', fontSize: '0.68rem', color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
                {isAdmin ? 'Admin' : 'Approver'}
              </div>
              {adminItems.map(item => (
                <NavLink key={item.to} to={item.to} style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                  borderRadius: 8, fontSize: '0.875rem', fontWeight: 500,
                  textDecoration: 'none', transition: 'all 150ms',
                  background: isActive ? 'var(--accent-dim)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text-2)',
                })}>
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* User */}
        <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, marginBottom: 4 }}>
            <div style={{
              width: 32, height: 32, background: 'var(--bg-3)', border: '1px solid var(--border)',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent)', flexShrink: 0
            }}>
              {profile?.full_name?.[0]?.toUpperCase() || '?'}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.full_name || 'User'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', textTransform: 'capitalize' }}>
                {profile?.role || 'viewer'}
              </div>
            </div>
          </div>
          <button onClick={handleSignOut} className="btn btn-ghost btn-sm btn-full" style={{ justifyContent: 'flex-start' }}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  )
}
