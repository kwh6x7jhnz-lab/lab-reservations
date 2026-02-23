import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { generateICS, downloadICS } from '../../lib/ics'
import { BOOKING_TYPES, TIME_SLOTS_AMPM } from '../../lib/constants'
import { X, MapPin, AlertCircle, Calendar, Download, Search, UserPlus } from 'lucide-react'
import { format, addDays } from 'date-fns'

export default function BookingModal({ equipment, onClose, prefillDate, prefillStartTime, prefillEndTime, editBooking }) {
  const { user } = useAuth()
  const toast = useToast()

  const isEdit = !!editBooking

  const initDate = editBooking ? format(new Date(editBooking.start_time), 'yyyy-MM-dd')
    : prefillDate ? format(new Date(prefillDate), 'yyyy-MM-dd')
    : format(new Date(), 'yyyy-MM-dd')

  const initStartTime = editBooking ? format(new Date(editBooking.start_time), 'HH:mm')
    : prefillStartTime ? format(new Date(prefillStartTime), 'HH:mm')
    : '09:00'

  const initEndTime = editBooking ? format(new Date(editBooking.end_time), 'HH:mm')
    : prefillEndTime ? format(new Date(prefillEndTime), 'HH:mm')
    : '11:00'

  const [bookingType, setBookingType] = useState(editBooking?.booking_type || BOOKING_TYPES.TIME_SLOT)
  const [date, setDate] = useState(initDate)
  const [endDate, setEndDate] = useState(editBooking ? format(new Date(editBooking.end_time), 'yyyy-MM-dd') : format(addDays(new Date(initDate), 1), 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState(initStartTime)
  const [endTime, setEndTime] = useState(initEndTime)
  const [halfDay, setHalfDay] = useState('AM')
  const [notes, setNotes] = useState(editBooking?.notes || '')
  const [loading, setLoading] = useState(false)
  const [conflicts, setConflicts] = useState([])
  const [step, setStep] = useState('form')
  const [additionalUsers, setAdditionalUsers] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [userResults, setUserResults] = useState([])

  const buildTimes = () => {
    if (bookingType === BOOKING_TYPES.TIME_SLOT) {
      return { start: new Date(date + 'T' + startTime + ':00'), end: new Date(date + 'T' + endTime + ':00') }
    } else if (bookingType === BOOKING_TYPES.HALF_DAY) {
      return halfDay === 'AM'
        ? { start: new Date(date + 'T08:00:00'), end: new Date(date + 'T12:00:00') }
        : { start: new Date(date + 'T12:00:00'), end: new Date(date + 'T17:00:00') }
    } else if (bookingType === BOOKING_TYPES.FULL_DAY) {
      return { start: new Date(date + 'T08:00:00'), end: new Date(date + 'T17:00:00') }
    } else {
      return { start: new Date(date + 'T08:00:00'), end: new Date(endDate + 'T17:00:00') }
    }
  }

  useEffect(() => {
    async function checkConflicts() {
      try {
        const { start, end } = buildTimes()
        let query = supabase.from('bookings')
          .select('id')
          .eq('equipment_id', equipment.id)
          .in('status', ['approved', 'pending'])
          .lt('start_time', end.toISOString())
          .gt('end_time', start.toISOString())
        if (isEdit) query = query.neq('id', editBooking.id)
        const { data } = await query
        setConflicts(data || [])
      } catch {}
    }
    checkConflicts()
  }, [date, endDate, startTime, endTime, bookingType, halfDay])

  useEffect(() => {
    if (!userSearch || userSearch.length < 2) { setUserResults([]); return }
    const timer = setTimeout(async () => {
      const { data } = await supabase.from('profiles')
        .select('id, full_name, email')
        .or('full_name.ilike.%' + userSearch + '%,email.ilike.%' + userSearch + '%')
        .neq('id', user.id)
        .limit(5)
      setUserResults((data || []).filter(u => !additionalUsers.find(a => a.id === u.id)))
    }, 300)
    return () => clearTimeout(timer)
  }, [userSearch, additionalUsers, user.id])

  function addUser(u) { setAdditionalUsers(prev => [...prev, u]); setUserSearch(''); setUserResults([]) }
  function removeUser(id) { setAdditionalUsers(prev => prev.filter(u => u.id !== id)) }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    const { start, end } = buildTimes()
    if (end <= start) { toast('End time must be after start time', 'error'); setLoading(false); return }
    if (conflicts.length > 0) { toast('This equipment is already booked during that time.', 'error'); setLoading(false); return }

    if (isEdit) {
      const { error } = await supabase.from('bookings').update({
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        booking_type: bookingType,
        notes,
      }).eq('id', editBooking.id)
      if (error) { toast(error.message, 'error'); setLoading(false); return }
      toast('Booking updated!', 'success')
      setStep('success')
      setLoading(false)
      return
    }

    const status = equipment.approval_required ? 'pending' : 'approved'
    const bookingData = { equipment_id: equipment.id, start_time: start.toISOString(), end_time: end.toISOString(), booking_type: bookingType, notes, status }

    const { error } = await supabase.from('bookings').insert({ ...bookingData, user_id: user.id })
    if (error) { toast(error.message, 'error'); setLoading(false); return }

    if (additionalUsers.length > 0) {
      await supabase.from('bookings').insert(additionalUsers.map(u => ({ ...bookingData, user_id: u.id })))
    }

    if (!equipment.approval_required) {
      const icsContent = generateICS({
        title: 'Lab Equipment: ' + equipment.name,
        description: 'Equipment: ' + equipment.name + '\nLocation: ' + equipment.location,
        location: (equipment.location || '') + ', ' + (equipment.floor_building || ''),
        startDate: start, endDate: end,
        organizerEmail: 'noreply@lilly.com',
        attendeeEmail: user.email,
      })
      downloadICS(icsContent, 'reservation-' + equipment.asset_tag + '.ics')
    }

    setStep('success')
    setLoading(false)
  }

  if (step === 'success') return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(10,124,78,0.1)', border: '2px solid var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Calendar size={24} color="var(--success)" />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
          {isEdit ? 'Booking Updated!' : equipment.approval_required ? 'Request Submitted!' : 'Booking Confirmed!'}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>
          {isEdit ? 'Your reservation has been updated.' : equipment.approval_required ? 'Your request is pending approval.' : 'Your reservation is confirmed. A .ics calendar invite has been downloaded.'}
        </p>
        <button className="btn btn-primary" onClick={onClose}>Done</button>
      </div>
    </div>
  )

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 600 }}>{isEdit ? 'Edit Booking' : equipment.name}</h2>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} />{equipment.location}</span>
              {equipment.category && <span className="badge badge-blue" style={{ fontSize: 11 }}>{equipment.category}</span>}
              {equipment.approval_required && <span className="badge badge-yellow" style={{ fontSize: 11 }}>Approval Required</span>}
              {equipment.training_required && <span className="badge badge-red" style={{ fontSize: 11 }}><AlertCircle size={10} />Training Required</span>}
            </div>
            {isEdit && <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-muted)' }}>{equipment.name}</div>}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={18} /></button>
        </div>

        {equipment.training_required && !isEdit && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--danger)', display: 'flex', gap: 8 }}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span><strong>Training required</strong> — contact the owner before using: {equipment.owner || 'see admin'}</span>
          </div>
        )}

        {conflicts.length > 0 && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--danger)' }}>
            🚫 <strong>This equipment is already booked</strong> during this time. Please select a different date or time.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Booking Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {[['time_slot','Time Slot'],['half_day','Half Day'],['full_day','Full Day'],['multi_day','Multi-Day']].map(([val, label]) => (
                <button key={val} type="button" onClick={() => setBookingType(val)}
                  style={{ padding: '8px 4px', borderRadius: 8, border: '1px solid ' + (bookingType === val ? 'var(--accent)' : 'var(--border)'), background: bookingType === val ? 'var(--accent-glow)' : 'var(--bg-elevated)', color: bookingType === val ? 'var(--accent)' : 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: bookingType === 'multi_day' ? '1fr 1fr' : '1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">{bookingType === 'multi_day' ? 'Start Date' : 'Date'}</label>
              <input className="form-input" type="date" value={date} min={format(new Date(), 'yyyy-MM-dd')} onChange={e => setDate(e.target.value)} required />
            </div>
            {bookingType === 'multi_day' && (
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input className="form-input" type="date" value={endDate} min={date} onChange={e => setEndDate(e.target.value)} required />
              </div>
            )}
          </div>

          {bookingType === 'time_slot' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Start Time</label>
                <select className="form-input" value={startTime} onChange={e => setStartTime(e.target.value)}>
                  {TIME_SLOTS_AMPM.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">End Time</label>
                <select className="form-input" value={endTime} onChange={e => setEndTime(e.target.value)}>
                  {TIME_SLOTS_AMPM.filter(t => t.value > startTime).map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {bookingType === 'half_day' && (
            <div className="form-group">
              <label className="form-label">Which Half?</label>
              <select className="form-input" value={halfDay} onChange={e => setHalfDay(e.target.value)}>
                <option value="AM">Morning (8:00 AM – 12:00 PM)</option>
                <option value="PM">Afternoon (12:00 PM – 5:00 PM)</option>
              </select>
            </div>
          )}

          {!isEdit && (
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><UserPlus size={13} /> Add Other Users to This Booking</label>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Search by name or email..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                {userResults.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, marginTop: 4 }}>
                    {userResults.map(u => (
                      <div key={u.id} onClick={() => addUser(u)} style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, borderBottom: '1px solid var(--border)', background: '#fff' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                        <div>
                          <div style={{ fontWeight: 500 }}>{u.full_name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--accent)' }}>+ Add</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {additionalUsers.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {additionalUsers.map(u => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent-glow)', border: '1px solid rgba(0,87,184,0.2)', borderRadius: 20, padding: '4px 10px', fontSize: 13 }}>
                      <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{u.full_name}</span>
                      <button type="button" onClick={() => removeUser(u.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 0, display: 'flex' }}><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <textarea className="form-input" rows={3} placeholder="Purpose, experiment details..." value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical' }} />
          </div>

          {!equipment.approval_required && !isEdit && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--success)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <Download size={14} /> A .ics calendar invite will download automatically.
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || conflicts.length > 0}>
              {loading ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : isEdit ? 'Save Changes' : equipment.approval_required ? 'Submit Request' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
