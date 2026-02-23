import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { format } from 'date-fns'
import { Search } from 'lucide-react'

const StatusBadge = ({ status }) => {
  const map = { pending: 'badge-yellow', approved: 'badge-green', rejected: 'badge-red', cancelled: 'badge-gray' }
  return <span className={'badge ' + (map[status] || 'badge-gray')} style={{ textTransform: 'capitalize' }}>{status}</span>
}

export default function AdminBookings() {
  const toast = useToast()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 25

  useEffect(() => { load() }, [])

  async function load() {
    const { data: bookingData, error } = await supabase
      .from('bookings')
      .select('*, equipment(name, asset_tag, location)')
      .order('created_at', { ascending: false })

    if (error) { console.error('Admin bookings error:', error); setLoading(false); return }

    const userIds = [...new Set((bookingData || []).map(b => b.user_id))]
    let profileMap = {}
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)
      if (profiles) profiles.forEach(p => { profileMap[p.id] = p })
    }

    setBookings((bookingData || []).map(b => ({ ...b, profiles: profileMap[b.user_id] || null })))
    setLoading(false)
  }

  async function updateStatus(id, status) {
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
    if (error) { toast(error.message, 'error'); return }
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
    toast('Status updated', 'success')
  }

  const filtered = bookings.filter(b => {
    const matchSearch = !search ||
      b.equipment?.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.profiles?.email?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || b.status === statusFilter
    return matchSearch && matchStatus
  })

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  if (loading) return <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">All Bookings</h1>
        <p className="page-subtitle">{filtered.length.toLocaleString()} bookings</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Search by equipment or user..." value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} />
        </div>
        <select className="form-input" style={{ width: 'auto' }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0) }}>
          <option value="all">All Status</option>
          {['pending','approved','rejected','cancelled'].map(s => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Equipment</th>
                <th>User</th>
                <th>Start</th>
                <th>End</th>
                <th>Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(b => (
                <tr key={b.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{b.equipment?.name || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'Space Mono' }}>{b.equipment?.asset_tag}</div>
                  </td>
                  <td>
                    <div>{b.profiles?.full_name || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{b.profiles?.email}</div>
                  </td>
                  <td style={{ fontFamily: 'Space Mono', fontSize: 12 }}>{format(new Date(b.start_time), 'MMM d, h:mm a')}</td>
                  <td style={{ fontFamily: 'Space Mono', fontSize: 12 }}>{format(new Date(b.end_time), 'MMM d, h:mm a')}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{b.booking_type?.replace(/_/g, ' ')}</td>
                  <td><StatusBadge status={b.status} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {b.status === 'pending' && <>
                        <button className="btn btn-sm btn-primary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => updateStatus(b.id, 'approved')}>Approve</button>
                        <button className="btn btn-sm btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => updateStatus(b.id, 'rejected')}>Reject</button>
                      </>}
                      {b.status === 'approved' && (
                        <button className="btn btn-sm btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => updateStatus(b.id, 'cancelled')}>Cancel</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No bookings found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16, alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>← Prev</button>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Page {page + 1} of {totalPages}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>Next →</button>
        </div>
      )}
    </div>
  )
}
