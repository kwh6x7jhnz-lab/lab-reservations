import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { LayoutDashboard, Calendar, Package, ClipboardList, Users, Upload, LogOut, Bell, Settings, ChevronDown, User } from 'lucide-react'
import { useState } from 'react'
import LILLY_LOGO from '../../lib/logo'

const NavItem = ({ to, icon: Icon, label, badge }) => (
  <NavLink to={to} style={({ isActive }) => ({
    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderRadius: 8,
    textDecoration: 'none', fontSize: 14, fontWeight: 500, transition: 'all 0.15s',
    color: isActive ? 'var(--accent)' : 'var(--text-muted)',
    background: isActive ? 'var(--accent-glow)' : 'transparent',
    border: isActive ? '1px solid rgba(208,33,42,0.2)' : '1px solid transparent',
  })}>
    <Icon size={17} />
    <span style={{ flex: 1 }}>{label}</span>
    {badge ? <span style={{ background: 'var(--danger)', color: '#fff', fontSize: 11, padding: '1px 7px', borderRadius: 10, fontWeight: 600 }}>{badge}</span> : null}
  </NavLink>
)

export default function Sidebar({ pendingCount }) {
  const { profile, isAdmin, isApprover } = useAuth()
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <aside style={{ width: 230, minHeight: '100vh', background: '#fff', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '20px 12px', position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100, boxShadow: '2px 0 8px rgba(0,0,0,0.04)' }}>

      <div style={{ padding: '4px 10px 20px', borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
  <div style={{ background: '#fff', borderRadius: 8, padding: '6px 8px', display: 'inline-block', marginBottom: 8 }}>
    <img src={LILLY_LOGO} alt="Lilly" style={{ height: 44, objectFit: 'contain', display: 'block' }} />
  </div>
  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>Lab Equipment Reservations</div>
</div>

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

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, position: 'relative' }}>
        <button onClick={() => setShowUserMenu(!showUserMenu)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 8, background: showUserMenu ? 'var(--bg-elevated)' : 'none', border: 'none', cursor: 'pointer', transition: 'all 0.15s' }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-glow)', border: '1px solid rgba(208,33,42,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <User size={14} color="var(--accent)" />
          </div>
          <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.full_name || 'Loading...'}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'capitalize' }}>{profile?.role || 'viewer'}</div>
          </div>
          <ChevronDown size={14} color="var(--text-dim)" style={{ flexShrink: 0, transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
        </button>

        {showUserMenu && (
          <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 -4px 20px rgba(0,0,0,0.1)', marginBottom: 4, overflow: 'hidden' }}>
            <NavLink to="/account" onClick={() => setShowUserMenu(false)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', textDecoration: 'none', color: 'var(--text)', fontSize: 14, borderBottom: '1px solid var(--border)', background: '#fff' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
              <User size={15} /> My Account
            </NavLink>
            <button onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 14 }}
              onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <LogOut size={15} /> Sign Out
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
