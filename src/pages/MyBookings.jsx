import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { generateICS, downloadICS } from '../lib/ics'
import { Calendar, Download, X, Edit2 } from 'lucide-react'
import { format } from 'date-fns'
import BookingModal from '../components/booking/BookingModal'

const StatusBadge = ({ status }) => {
  const map = { pending: 'badge-yellow', approved: 'badge-green', rejected: 'badge-red', cancelled: 'badge-gray' }
  return <span className={'badge ' + (map[status] || 'badge-gray')} style={{ textTransform: 'capitalize' }}>{status}</span>
}

export default function MyBookings() {
  const { user } = useAuth()
  const toast = useToast()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [editingBooking, setEditingBooking] = useState(null)

  useEffect(() => { load() }, [user])

  async function load() {
    const { data } = await supabase.from('bookings')
      .select('*, equipment(id, name, asset_tag, location, floor_building, category, owner, approval_required, training_required)')
      .eq('user_id', user.id)
      .order('start_time', { ascending: false })
    setBookings(data || [])
    setLoading(false)
  }

  async function cancelBooking(id) {
    if (!confirm('Cancel this booking?')) return
    const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id)
    if (error) { toast(error.message, 'error'); return }
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b))
    toast('Booking cancelled', 'success')
  }

  function downloadCalendar(booking) {
    const ics = generateICS({
      title: 'Lab Equipment: ' + booking.equipment?.name,
      description: 'Equipment: ' + booking.equipment?.name + '\nLocation: ' + booking.equipment?.location,
      location: (booking.equipment?.location || '') + ', ' + (booking.equipment?.floor_building || ''),
      startDate: new Date(booking.start_time),
      endDate: new Date(booking.end_time),
      organizerEmail: 'noreply@lilly.com',
      attendeeEmail: user.email,
    })
    downloadICS(ics, 'reservation-' + booking.equipment?.asset_tag + '.ics')
  }

  const isFuture = (b) => new Date(b.start_time) > new Date()
  const canEdit = (b) => isFuture(b) && (b.status === 'pending' || b.status === 'approved')
  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter)

  if (loading) return <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">My Bookings</h1>
        <p className="page-subtitle">{bookings.length} total reservations</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {['all', 'approved', 'pending', 'rejected', 'cancelled'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={'btn btn-sm ' + (filter === s ? 'btn-primary' : 'btn-secondary')} style={{ textTransform: 'capitalize' }}>{s}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <Calendar size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div>No bookings found</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(b => (
            <div key={b.id} className="card" style={{ display: 'flex', gap: 16, alignItems: 'center', opacity: b.status === 'cancelled' || b.status === 'rejected' ? 0.7 : 1 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{b.equipment?.name || 'Unknown'}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
                  {b.equipment?.location}{b.equipment?.floor_building ? ' · ' + b.equipment.floor_building : ''}
                </div>
                <div style={{ fontSize: 12, fontFamily: 'Space Mono', color: 'var(--text-dim)', marginTop: 4 }}>
                  {format(new Date(b.start_time), 'MMM d, yyyy · h:mm a')} → {format(new Date(b.end_time), 'h:mm a')}
                </div>
                {b.notes && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>"{b.notes}"</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                <StatusBadge status={b.status} />
                {b.status === 'approved' && (
                  <button className="btn btn-secondary btn-sm" onClick={() => downloadCalendar(b)} title="Download .ics"><Download size={14} /></button>
                )}
                {canEdit(b) && (
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditingBooking(b)} title="Edit booking"><Edit2 size={14} /></button>
                )}
                {canEdit(b) && (
                  <button className="btn btn-sm" style={{ background: '#fef2f2', color: 'var(--danger)', border: '1px solid #fca5a5' }} onClick={() => cancelBooking(b.id)} title="Cancel booking"><X size={14} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editingBooking && editingBooking.equipment && (
        <BookingModal
          equipment={editingBooking.equipment}
          editBooking={editingBooking}
          onClose={() => { setEditingBooking(null); load() }}
        />
      )}
    </div>
  )
}
