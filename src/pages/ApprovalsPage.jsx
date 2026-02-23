import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import { generateICS, downloadICS } from '../lib/ics'
import { CheckCircle, XCircle, Clock, MapPin, Calendar, User } from 'lucide-react'
import { format, parseISO } from 'date-fns'

export default function ApprovalsPage() {
  const { toast } = useToast()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState(null)

  useEffect(() => {
    fetchPending()
  }, [])

  async function fetchPending() {
    const { data } = await supabase
      .from('bookings')
      .select('*, equipment(name, asset_tag, location, floor, requires_approval), profiles(full_name, email)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    if (data) setBookings(data)
    setLoading(false)
  }

  const handleApprove = async (booking) => {
    setProcessing(booking.id)
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'confirmed', approved_at: new Date().toISOString() })
      .eq('id', booking.id)

    if (!error) {
      // Generate and "send" ICS (in a real app you'd email it; here we log it)
      toast({ message: `Approved booking for ${booking.profiles?.full_name}`, type: 'success' })
      fetchPending()
    } else {
      toast({ message: 'Failed to approve booking.', type: 'error' })
    }
    setProcessing(null)
  }

  const handleReject = async () => {
    if (!rejectModal) return
    setProcessing(rejectModal.id)
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'rejected', rejection_reason: rejectReason })
      .eq('id', rejectModal.id)

    if (!error) {
      toast({ message: 'Booking rejected.', type: 'info' })
      setRejectModal(null)
      setRejectReason('')
      fetchPending()
    } else {
      toast({ message: 'Failed to reject booking.', type: 'error' })
    }
    setProcessing(null)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Approval Queue</h1>
          <p style={{ color: 'var(--text-2)', marginTop: 4, fontSize: '0.9rem' }}>
            {bookings.length} booking{bookings.length !== 1 ? 's' : ''} awaiting review
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <span className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : bookings.length === 0 ? (
        <div className="empty-state">
          <CheckCircle size={40} />
          <h3>All caught up!</h3>
          <p>No bookings are awaiting approval</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {bookings.map(b => (
            <div key={b.id} className="card" style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1rem' }}>{b.equipment?.name}</h3>
                  <span className="badge badge-yellow"><Clock size={10} /> Pending</span>
                  <span className="badge badge-gray">{b.booking_type}</span>
                </div>

                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-2)', marginBottom: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <User size={13} />
                    {b.profiles?.full_name} ({b.profiles?.email})
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Calendar size={13} />
                    {format(parseISO(b.start_time), 'EEE, MMM d, yyyy')}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Clock size={13} />
                    {format(parseISO(b.start_time), 'h:mm a')} – {format(parseISO(b.end_time), 'h:mm a')}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <MapPin size={13} />
                    {b.equipment?.location}
                  </span>
                </div>

                {b.notes && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', padding: '8px 12px', background: 'var(--bg-3)', borderRadius: 6 }}>
                    Notes: {b.notes}
                  </p>
                )}

                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 6 }}>
                  Submitted {format(parseISO(b.created_at), 'MMM d, h:mm a')}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => { setRejectModal(b) }}
                  className="btn btn-danger btn-sm"
                  disabled={processing === b.id}
                >
                  <XCircle size={14} /> Reject
                </button>
                <button
                  onClick={() => handleApprove(b)}
                  className="btn btn-primary btn-sm"
                  disabled={processing === b.id}
                >
                  {processing === b.id
                    ? <span className="spinner" style={{ width: 12, height: 12 }} />
                    : <CheckCircle size={14} />
                  }
                  Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Reject Booking</div>
              <button onClick={() => setRejectModal(null)} className="btn btn-ghost btn-sm" style={{ padding: 6 }}>✕</button>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', marginBottom: 16 }}>
              You're rejecting <strong style={{ color: 'var(--text)' }}>{rejectModal.profiles?.full_name}</strong>'s booking for <strong style={{ color: 'var(--text)' }}>{rejectModal.equipment?.name}</strong>.
            </p>
            <div className="form-group">
              <label className="form-label">Reason for rejection <span style={{ color: 'var(--text-3)', fontWeight: 400, textTransform: 'none' }}>(shown to requester)</span></label>
              <textarea
                className="form-textarea"
                placeholder="e.g. Equipment is under maintenance during that period..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
            </div>
            <div className="modal-footer">
              <button onClick={() => setRejectModal(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleReject} className="btn btn-danger" disabled={processing === rejectModal?.id}>
                {processing === rejectModal?.id ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <XCircle size={14} />}
                Reject Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
