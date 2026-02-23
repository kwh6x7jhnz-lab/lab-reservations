import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import { generateICS, downloadICS } from '../lib/ics'
import { CheckCircle, XCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'

export default function ApprovalQueue() {
  const toast = useToast()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('bookings')
      .select('*, equipment(name, asset_tag, location, floor_building), profiles(full_name, email)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    setBookings(data || [])
    setLoading(false)
  }

  async function handleAction(id, action) {
    setProcessing(id)
    const booking = bookings.find(b => b.id === id)
    const { error } = await supabase.from('bookings').update({ status: action, reviewed_at: new Date().toISOString() }).eq('id', id)
    if (error) { toast(error.message, 'error'); setProcessing(null); return }

    if (action === 'approved' && booking) {
      const ics = generateICS({
        title: 'Lab Equipment: ' + booking.equipment?.name,
        description: 'Your reservation has been approved.\nEquipment: ' + booking.equipment?.name + '\nLocation: ' + booking.equipment?.location,
        location: (booking.equipment?.location || '') + ', ' + (booking.equipment?.floor_building || ''),
        startDate: new Date(booking.start_time),
        endDate: new Date(booking.end_time),
        organizerEmail: 'noreply@lilly.com',
        attendeeEmail: booking.profiles?.email || '',
      })
      downloadICS(ics, 'approved-reservation-' + booking.equipment?.asset_tag + '.ics')
    }

    setBookings(prev => prev.filter(b => b.id !== id))
    toast(action === 'approved' ? 'Booking approved ✓' : 'Booking rejected', action === 'approved' ? 'success' : 'error')
    setProcessing(null)
  }

  if (loading) return <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Approval Queue</h1>
        <p className="page-subtitle">{bookings.length} pending request{bookings.length !== 1 ? 's' : ''}</p>
      </div>

      {bookings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          <CheckCircle size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div style={{ fontSize: 18, fontWeight: 600 }}>All caught up!</div>
          <div style={{ fontSize: 14, marginTop: 6 }}>No pending requests at this time.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {bookings.map(b => (
            <div key={b.id} className="card" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{b.equipment?.name}</span>
                  <span className="badge badge-blue" style={{ fontSize: 11 }}>{b.equipment?.asset_tag}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Requested by <strong style={{ color: 'var(--text)' }}>{b.profiles?.full_name}</strong> ({b.profiles?.email})
                </div>
                <div style={{ fontSize: 12, fontFamily: 'Space Mono', color: 'var(--text-dim)', marginTop: 4 }}>
                  {format(new Date(b.start_time), 'MMM d, yyyy h:mm a')} → {format(new Date(b.end_time), 'h:mm a')}
                </div>
                {b.notes && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, fontStyle: 'italic', background: 'var(--bg-elevated)', padding: '6px 10px', borderRadius: 6 }}>"{b.notes}"</div>}
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>Submitted {format(new Date(b.created_at), 'MMM d, h:mm a')}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => handleAction(b.id, 'rejected')} disabled={processing === b.id} style={{ color: 'var(--danger)', borderColor: 'rgba(255,77,109,0.3)' }}>
                  <XCircle size={15} /> Reject
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => handleAction(b.id, 'approved')} disabled={processing === b.id}>
                  {processing === b.id ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <><CheckCircle size={15} /> Approve</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
