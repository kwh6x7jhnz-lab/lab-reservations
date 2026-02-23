import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Package, Calendar, Clock, CheckCircle, XCircle, ArrowRight, Activity } from 'lucide-react'
import { format } from 'date-fns'
import { BOOKING_STATUS } from '../lib/constants'

const StatusBadge = ({ status }) => {
  const map = { pending: 'badge-yellow', approved: 'badge-green', rejected: 'badge-red', cancelled: 'badge-gray' }
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>
}

export default function Dashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ totalEquipment: 0, myBookings: 0, upcoming: 0, pending: 0 })
  const [recentBookings, setRecentBookings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [eqRes, bookRes, upcomingRes, pendingRes, recentRes] = await Promise.all([
        supabase.from('equipment').select('id', { count: 'exact', head: true }),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('user_id', profile?.id),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('user_id', profile?.id).eq('status', 'approved').gte('start_time', new Date().toISOString()),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('user_id', profile?.id).eq('status', 'pending'),
        supabase.from('bookings').select('*, equipment(name, location, floor_building)').eq('user_id', profile?.id).order('created_at', { ascending: false }).limit(5),
      ])
      setStats({ totalEquipment: eqRes.count || 0, myBookings: bookRes.count || 0, upcoming: upcomingRes.count || 0, pending: pendingRes.count || 0 })
      setRecentBookings(recentRes.data || [])
      setLoading(false)
    }
    if (profile) load()
  }, [profile])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  if (loading) return <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{greeting}, {profile?.full_name?.split(' ')[0] || 'there'} 👋</h1>
        <p className="page-subtitle">Here's what's happening with your lab equipment reservations.</p>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        {[
          { label: 'Total Equipment', value: stats.totalEquipment.toLocaleString(), icon: Package, color: 'var(--accent)' },
          { label: 'My Bookings', value: stats.myBookings, icon: Calendar, color: 'var(--success)' },
          { label: 'Upcoming', value: stats.upcoming, icon: Clock, color: 'var(--warning)' },
          { label: 'Pending Approval', value: stats.pending, icon: Activity, color: 'var(--danger)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: `${s.color}20`, border: `1px solid ${s.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <s.icon size={20} color={s.color} />
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.1, fontFamily: "'Space Mono', monospace" }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid-2" style={{ marginBottom: 28 }}>
        <Link to="/equipment" className="card card-hover" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Browse Equipment</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Find and book available equipment</div>
          </div>
          <ArrowRight size={20} color="var(--accent)" />
        </Link>
        <Link to="/calendar" className="card card-hover" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>View Calendar</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>See all reservations at a glance</div>
          </div>
          <ArrowRight size={20} color="var(--accent)" />
        </Link>
      </div>

      {/* Recent bookings */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Recent Bookings</h2>
          <Link to="/my-bookings" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>View all →</Link>
        </div>
        {recentBookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
            <Calendar size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
            <div>No bookings yet</div>
            <Link to="/equipment" className="btn btn-primary btn-sm" style={{ marginTop: 12, display: 'inline-flex' }}>Book equipment</Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Equipment</th><th>Location</th><th>Date</th><th>Status</th></tr></thead>
              <tbody>
                {recentBookings.map(b => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 500 }}>{b.equipment?.name || '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{b.equipment?.location || '—'}</td>
                    <td style={{ fontFamily: 'Space Mono', fontSize: 12 }}>{format(new Date(b.start_time), 'MMM d, yyyy h:mm a')}</td>
                    <td><StatusBadge status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
