import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { Beaker, LayoutDashboard, Calendar, Package, ClipboardList, Users, Upload, LogOut, Bell, Settings } from 'lucide-react'

const NavItem = ({ to, icon: Icon, label, badge }) => (
  <NavLink to={to} style={({ isActive }) => ({
    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderRadius: 8,
    textDecoration: 'none', fontSize: 14, fontWeight: 500, transition: 'all 0.15s',
    color: isActive ? 'var(--accent)' : 'var(--text-muted)',
    background: isActive ? 'var(--accent-glow)' : 'transparent',
    border: isActive ? '1px solid rgba(0,194,255,0.2)' : '1px solid transparent',
  })}>
    <Icon size={17} />
    <span style={{ flex: 1 }}>{label}</span>
    {badge ? <span style={{ background: 'var(--danger)', color: '#fff', fontSize: 11, padding: '1px 7px', borderRadius: 10, fontWeight: 600 }}>{badge}</span> : null}
  </NavLink>
)

export default function Sidebar({ pendingCount }) {
  const { profile, isAdmin, isApprover } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <aside style={{ width: 220, minHeight: '100vh', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '20px 12px', position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100 }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 10px 20px', borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
        <div style={{ width: 34, height: 34, background: 'var(--accent-glow)', border: '1px solid rgba(0,194,255,0.3)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Beaker size={18} color="var(--accent)" />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>Lab Reservations</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Eli Lilly</div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '4px 14px 6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Main</div>
        <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
        <NavItem to="/equipment" icon={Package} label="Equipment" />
        <NavItem to="/calendar" icon={Calendar} label="Calendar" />
        <NavItem to="/my-bookings" icon={ClipboardList} label="My Bookings" />

        {isApprover && (
          <>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '12px 14px 6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Approvals</div>
            <NavItem to="/approvals" icon={Bell} label="Approval Queue" badge={pendingCount > 0 ? pendingCount : null} />
          </>
        )}

        {isAdmin && (
          <>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '12px 14px 6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Admin</div>
            <NavItem to="/admin/equipment" icon={Settings} label="Manage Equipment" />
            <NavItem to="/admin/bookings" icon={ClipboardList} label="All Bookings" />
            <NavItem to="/admin/users" icon={Users} label="Users" />
            <NavItem to="/admin/import" icon={Upload} label="CSV Import" />
          </>
        )}
      </nav>

      {/* Profile */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <div style={{ padding: '8px 10px', marginBottom: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.full_name || 'Loading...'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
            <span style={{ textTransform: 'capitalize' }}>{profile?.role || 'viewer'}</span>
          </div>
        </div>
        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 14px', borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, transition: 'all 0.15s' }}
          onMouseEnter={e => { e.target.style.color = 'var(--danger)'; e.target.style.background = 'rgba(255,77,109,0.08)' }}
          onMouseLeave={e => { e.target.style.color = 'var(--text-muted)'; e.target.style.background = 'none' }}>
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
