import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { generateICS, downloadICS } from '../../lib/ics'
import { X, MapPin, AlertTriangle, Calendar, Clock } from 'lucide-react'
import { format, addHours, addDays, startOfDay, endOfDay, parseISO } from 'date-fns'

const BOOKING_TYPES = [
  { value: 'timeslot', label: 'Time Slot', desc: 'Pick a specific start and end time' },
  { value: 'halfday', label: 'Half Day', desc: 'Morning (8am–1pm) or Afternoon (1pm–6pm)' },
  { value: 'fullday', label: 'Full Day', desc: 'All day, 8am to 6pm' },
  { value: 'multiday', label: 'Multi-Day', desc: 'Multiple consecutive days' },
]

export default function BookingModal({ equipment, onClose }) {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [type, setType] = useState('timeslot')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('11:00')
  const [halfPeriod, setHalfPeriod] = useState('morning')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [conflict, setConflict] = useState(false)

  const getStartEnd = () => {
    if (type === 'timeslot') {
      return {
        start: new Date(`${date}T${startTime}:00`),
        end: new Date(`${date}T${endTime}:00`)
      }
    }
    if (type === 'halfday') {
      return halfPeriod === 'morning'
        ? { start: new Date(`${date}T08:00:00`), end: new Date(`${date}T13:00:00`) }
        : { start: new Date(`${date}T13:00:00`), end: new Date(`${date}T18:00:00`) }
    }
    if (type === 'fullday') {
      return { start: new Date(`${date}T08:00:00`), end: new Date(`${date}T18:00:00`) }
    }
    if (type === 'multiday') {
      return { start: new Date(`${startDate}T08:00:00`), end: new Date(`${endDate}T18:00:00`) }
    }
  }

  const checkConflicts = async () => {
    const { start, end } = getStartEnd()
    const { data } = await supabase
      .from('bookings')
      .select('id')
      .eq('equipment_id', equipment.id)
      .in('status', ['confirmed', 'pending'])
      .or(`start_time.lt.${end.toISOString()},end_time.gt.${start.toISOString()}`)
      .not('start_time', 'gte', end.toISOString())
      .not('end_time', 'lte', start.toISOString())

    // Simpler overlap check
    const { data: overlapping } = await supabase
      .from('bookings')
      .select('id, start_time, end_time')
      .eq('equipment_id', equipment.id)
      .in('status', ['confirmed', 'pending'])

    if (overlapping) {
      const hasConflict = overlapping.some(b => {
        const bs = new Date(b.start_time)
        const be = new Date(b.end_time)
        return start < be && end > bs
      })
      return hasConflict
    }
    return false
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { start, end } = getStartEnd()

    if (end <= start) {
      toast({ message: 'End time must be after start time.', type: 'error' })
      setLoading(false)
      return
    }

    const hasConflict = await checkConflicts()
    if (hasConflict) {
      setConflict(true)
      toast({ message: 'This equipment is already booked during that time.', type: 'error' })
      setLoading(false)
      return
    }

    const status = equipment.requires_approval ? 'pending' : 'confirmed'

    const { data, error } = await supabase.from('bookings').insert({
      equipment_id: equipment.id,
      user_id: user.id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      booking_type: type,
      notes,
      status,
    }).select().single()

    if (error) {
      toast({ message: 'Failed to create booking. Try again.', type: 'error' })
      setLoading(false)
      return
    }

    if (status === 'confirmed') {
      // Generate ICS
      const ics = generateICS({
        title: `Lab Booking: ${equipment.name}`,
        description: `Equipment: ${equipment.name}\nAsset Tag: ${equipment.asset_tag}\nLocation: ${equipment.location}, ${equipment.floor}\n\nNotes: ${notes || 'None'}`,
        location: `${equipment.location}, ${equipment.floor}`,
        startDate: start,
        endDate: end,
        organizerEmail: user.email,
        organizerName: profile?.full_name || 'LabBook User'
      })
      downloadICS(ics, `booking-${equipment.name.replace(/\s+/g, '-')}.ics`)
      toast({ message: 'Booking confirmed! Calendar invite downloaded.', type: 'success' })
    } else {
      toast({ message: 'Booking submitted! Waiting for approval.', type: 'info' })
    }

    onClose()
    setLoading(false)
  }

  const { start, end } = getStartEnd() || {}

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">{equipment.name}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <MapPin size={12} />
              {equipment.location}{equipment.floor ? `, ${equipment.floor}` : ''}
              {equipment.requires_approval && (
                <span className="badge badge-yellow" style={{ marginLeft: 4 }}>
                  <AlertTriangle size={9} /> Requires Approval
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        {equipment.training_required && (
          <div style={{ padding: '10px 14px', background: 'var(--blue-dim)', border: '1px solid rgba(77,159,255,0.2)', borderRadius: 8, marginBottom: 20, fontSize: '0.82rem', color: 'var(--blue)' }}>
            ⚠️ Training is required before using this equipment. Ensure you are certified.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Booking type */}
          <div className="form-group">
            <label className="form-label">Booking Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {BOOKING_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  style={{
                    padding: '10px 14px', borderRadius: 8, border: `1px solid ${type === t.value ? 'var(--accent)' : 'var(--border)'}`,
                    background: type === t.value ? 'var(--accent-dim)' : 'var(--bg-3)',
                    color: type === t.value ? 'var(--accent)' : 'var(--text-2)',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 150ms'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{t.label}</div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.8, marginTop: 2 }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Date inputs */}
          {type === 'multiday' ? (
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input className="form-input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required min={format(new Date(), 'yyyy-MM-dd')} />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input className="form-input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required min={startDate} />
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} required min={format(new Date(), 'yyyy-MM-dd')} />
            </div>
          )}

          {/* Time inputs for timeslot */}
          {type === 'timeslot' && (
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Start Time</label>
                <input className="form-input" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">End Time</label>
                <input className="form-input" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
              </div>
            </div>
          )}

          {/* Half day selection */}
          {type === 'halfday' && (
            <div className="form-group">
              <label className="form-label">Period</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ v: 'morning', label: 'Morning', sub: '8am – 1pm' }, { v: 'afternoon', label: 'Afternoon', sub: '1pm – 6pm' }].map(p => (
                  <button
                    key={p.v}
                    type="button"
                    onClick={() => setHalfPeriod(p.v)}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 8,
                      border: `1px solid ${halfPeriod === p.v ? 'var(--accent)' : 'var(--border)'}`,
                      background: halfPeriod === p.v ? 'var(--accent-dim)' : 'var(--bg-3)',
                      color: halfPeriod === p.v ? 'var(--accent)' : 'var(--text-2)',
                      cursor: 'pointer', transition: 'all 150ms'
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.label}</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{p.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="form-group">
            <label className="form-label">Notes <span style={{ color: 'var(--text-3)', fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
            <textarea
              className="form-textarea"
              placeholder="Purpose of booking, experiment details, etc."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {conflict && (
            <div style={{ padding: '10px 14px', background: 'var(--red-dim)', border: '1px solid rgba(255,77,109,0.2)', borderRadius: 8, fontSize: '0.82rem', color: 'var(--red)' }}>
              This equipment is already booked during that time. Please choose a different slot.
            </div>
          )}

          {/* Summary */}
          {start && end && (
            <div style={{ padding: '12px 14px', background: 'var(--bg-3)', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.82rem', color: 'var(--text-2)' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Calendar size={14} />
                <span><strong style={{ color: 'var(--text)' }}>
                  {type === 'multiday'
                    ? `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
                    : format(start, 'EEEE, MMM d, yyyy')
                  }
                </strong></span>
              </div>
              {type !== 'multiday' && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                  <Clock size={14} />
                  <span>{format(start, 'h:mm a')} – {format(end, 'h:mm a')}</span>
                </div>
              )}
            </div>
          )}

          <div className="modal-footer" style={{ marginTop: 4 }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
              {equipment.requires_approval ? 'Submit for Approval' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
