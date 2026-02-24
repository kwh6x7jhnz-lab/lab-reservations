import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { generateICS, downloadICS } from '../../lib/ics'
import { BOOKING_TYPES, TIME_SLOTS_AMPM } from '../../lib/constants'
import { X, MapPin, AlertCircle, Calendar, Download, Search, UserPlus, Package } from 'lucide-react'
import { format, addDays } from 'date-fns'

// ─── Equipment search pill ────────────────────────────────────────────────────
function EquipmentPill({ eq, onRemove }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent-glow)', border: '1px solid rgba(208,33,42,0.2)', borderRadius: 20, padding: '4px 10px', fontSize: 13 }}>
      <Package size={11} color="var(--accent)" />
      <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{eq.name}</span>
      {eq.approval_required && <span style={{ fontSize: 10, color: '#b45309', background: '#fef9c3', borderRadius: 4, padding: '1px 5px' }}>Approval</span>}
      {onRemove && (
        <button type="button" onClick={() => onRemove(eq.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 0, display: 'flex' }}><X size={12} /></button>
      )}
    </div>
  )
}

// ─── User pill ────────────────────────────────────────────────────────────────
function UserPill({ u, onRemove }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f0f7ff', border: '1px solid rgba(0,87,184,0.2)', borderRadius: 20, padding: '4px 10px', fontSize: 13 }}>
      <span style={{ color: '#0057b8', fontWeight: 500 }}>{u.full_name}</span>
      {onRemove && (
        <button type="button" onClick={() => onRemove(u.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 0, display: 'flex' }}><X size={12} /></button>
      )}
    </div>
  )
}

export default function BookingModal({ equipment: initialEquipment, onClose, prefillDate, prefillStartTime, prefillEndTime, editBooking }) {
  const { user } = useAuth()
  const toast = useToast()
  const isEdit = !!editBooking

  // ── Initial values ──────────────────────────────────────────────────────────
  const initDate      = editBooking ? format(new Date(editBooking.start_time), 'yyyy-MM-dd')
    : prefillDate     ? format(new Date(prefillDate), 'yyyy-MM-dd')
    : format(new Date(), 'yyyy-MM-dd')

  const initStartTime = editBooking ? format(new Date(editBooking.start_time), 'HH:mm')
    : prefillStartTime ? format(new Date(prefillStartTime), 'HH:mm')
    : '09:00'

  const initEndTime   = editBooking ? format(new Date(editBooking.end_time), 'HH:mm')
    : prefillEndTime  ? format(new Date(prefillEndTime), 'HH:mm')
    : '11:00'

  // ── Form state ──────────────────────────────────────────────────────────────
  const [bookingType, setBookingType]   = useState(editBooking?.booking_type || BOOKING_TYPES.TIME_SLOT)
  const [date, setDate]                 = useState(initDate)
  const [endDate, setEndDate]           = useState(editBooking ? format(new Date(editBooking.end_time), 'yyyy-MM-dd') : format(addDays(new Date(initDate), 1), 'yyyy-MM-dd'))
  const [startTime, setStartTime]       = useState(initStartTime)
  const [endTime, setEndTime]           = useState(initEndTime)
  const [halfDay, setHalfDay]           = useState('AM')
  const [title, setTitle]               = useState(editBooking?.title || '')
  const [notes, setNotes]               = useState(editBooking?.notes || '')
  const [loading, setLoading]           = useState(false)
  const [conflicts, setConflicts]       = useState([])
  const [step, setStep]                 = useState('form')

  // ── Equipment list (multi) ──────────────────────────────────────────────────
  const [selectedEquipment, setSelectedEquipment] = useState(
    initialEquipment ? [initialEquipment] : []
  )
  const [equipSearch, setEquipSearch]   = useState('')
  const [equipResults, setEquipResults] = useState([])

  // ── Additional users ────────────────────────────────────────────────────────
  const [additionalUsers, setAdditionalUsers] = useState([])
  const [userSearch, setUserSearch]     = useState('')
  const [userResults, setUserResults]   = useState([])

  // Load existing equipment for edit mode
  useEffect(() => {
    if (!isEdit) return
    async function loadEquipment() {
      const { data } = await supabase
        .from('booking_equipment')
        .select('equipment:equipment_id(id, name, location, category, approval_required, training_required, asset_tag)')
        .eq('booking_id', editBooking.id)
      if (data) setSelectedEquipment(data.map(d => d.equipment).filter(Boolean))
    }
    loadEquipment()
  }, [isEdit, editBooking?.id])

  // ── Derived values ──────────────────────────────────────────────────────────
  const anyApprovalRequired = selectedEquipment.some(e => e.approval_required)
  const anyTrainingRequired = selectedEquipment.some(e => e.training_required)

  const defaultTitle = selectedEquipment.length === 0 ? ''
    : selectedEquipment.length === 1 ? selectedEquipment[0].name
    : selectedEquipment[0].name + ' + ' + (selectedEquipment.length - 1) + ' other' + (selectedEquipment.length > 2 ? 's' : '')

  function buildTimes() {
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

  // ── Conflict detection across ALL selected equipment ────────────────────────
  useEffect(() => {
    async function checkConflicts() {
      if (selectedEquipment.length === 0) { setConflicts([]); return }
      try {
        const { start, end } = buildTimes()
        const equipIds = selectedEquipment.map(e => e.id)

        // Check via booking_equipment junction table
        let query = supabase
          .from('booking_equipment')
          .select('equipment_id, booking:booking_id(id, status, start_time, end_time)')
          .in('equipment_id', equipIds)

        const { data } = await query
        if (!data) return

        const conflicting = data.filter(row => {
          const b = row.booking
          if (!b) return false
          if (!['approved', 'pending'].includes(b.status)) return false
          if (isEdit && b.id === editBooking.id) return false
          return new Date(b.start_time) < end && new Date(b.end_time) > start
        })

        setConflicts(conflicting)
      } catch {}
    }
    checkConflicts()
  }, [date, endDate, startTime, endTime, bookingType, halfDay, selectedEquipment])

  // ── Equipment search ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!equipSearch || equipSearch.length < 2) { setEquipResults([]); return }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('equipment')
        .select('id, name, location, category, asset_tag, approval_required, training_required')
        .eq('is_bookable', true)
        .or('name.ilike.%' + equipSearch + '%,asset_tag.ilike.%' + equipSearch + '%')
        .limit(8)
      setEquipResults((data || []).filter(e => !selectedEquipment.find(s => s.id === e.id)))
    }, 300)
    return () => clearTimeout(timer)
  }, [equipSearch, selectedEquipment])

  // ── User search ─────────────────────────────────────────────────────────────
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

  function addEquipment(eq) { setSelectedEquipment(prev => [...prev, eq]); setEquipSearch(''); setEquipResults([]) }
  function removeEquipment(id) { setSelectedEquipment(prev => prev.filter(e => e.id !== id)) }
  function addUser(u) { setAdditionalUsers(prev => [...prev, u]); setUserSearch(''); setUserResults([]) }
  function removeUser(id) { setAdditionalUsers(prev => prev.filter(u => u.id !== id)) }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    if (selectedEquipment.length === 0) { toast('Select at least one instrument', 'error'); return }
    setLoading(true)

    const { start, end } = buildTimes()
    if (end <= start) { toast('End time must be after start time', 'error'); setLoading(false); return }
    if (conflicts.length > 0) { toast('One or more instruments are already booked during that time.', 'error'); setLoading(false); return }

    const finalTitle = title.trim() || defaultTitle
    const status     = anyApprovalRequired ? 'pending' : 'approved'
    const groupId    = selectedEquipment.length > 1 ? crypto.randomUUID() : null

    if (isEdit) {
      // Update booking fields
      const { error } = await supabase.from('bookings').update({
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        booking_type: bookingType,
        notes,
        title: finalTitle,
      }).eq('id', editBooking.id)

      if (error) { toast(error.message, 'error'); setLoading(false); return }

      // Sync equipment: delete all then reinsert
      await supabase.from('booking_equipment').delete().eq('booking_id', editBooking.id)
      await supabase.from('booking_equipment').insert(
        selectedEquipment.map(eq => ({ booking_id: editBooking.id, equipment_id: eq.id }))
      )

      toast('Booking updated!', 'success')
      setStep('success')
      setLoading(false)
      return
    }

    // ── Create new bookings ──────────────────────────────────────────────────
    const allUsers = [{ id: user.id }, ...additionalUsers]

    for (const u of allUsers) {
      const bookingData = {
        user_id:      u.id,
        equipment_id: selectedEquipment[0].id, // keep for backwards compat
        start_time:   start.toISOString(),
        end_time:     end.toISOString(),
        booking_type: bookingType,
        notes,
        title:        finalTitle,
        status,
        group_id:     groupId,
      }

      const { data: newBooking, error } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select('id')
        .single()

      if (error) { toast(error.message, 'error'); setLoading(false); return }

      // Insert all equipment into junction table
      await supabase.from('booking_equipment').insert(
        selectedEquipment.map(eq => ({ booking_id: newBooking.id, equipment_id: eq.id }))
      )
    }

    // Download ICS for approved bookings
    if (status === 'approved') {
      const equipNames = selectedEquipment.map(e => e.name).join(', ')
      const icsContent = generateICS({
        title:          'Lab Equipment: ' + finalTitle,
        description:    'Equipment: ' + equipNames,
        location:       (selectedEquipment[0]?.location || '') + ', ' + (selectedEquipment[0]?.floor_building || ''),
        startDate:      start,
        endDate:        end,
        organizerEmail: 'noreply@lilly.com',
        attendeeEmail:  user.email,
      })
      downloadICS(icsContent, 'reservation-' + format(start, 'yyyyMMdd') + '.ics')
    }

    setStep('success')
    setLoading(false)
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (step === 'success') return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(10,124,78,0.1)', border: '2px solid var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Calendar size={24} color="var(--success)" />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
          {isEdit ? 'Booking Updated!' : anyApprovalRequired ? 'Request Submitted!' : 'Booking Confirmed!'}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>
          {isEdit ? 'Your reservation has been updated.'
            : anyApprovalRequired ? 'Your request is pending approval.'
            : 'Your reservation is confirmed. A .ics calendar invite has been downloaded.'}
        </p>
        <button className="btn btn-primary" onClick={onClose}>Done</button>
      </div>
    </div>
  )

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 600 }}>{isEdit ? 'Edit Booking' : 'New Booking'}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              {isEdit ? 'Update your reservation details below.' : 'Select instruments, date, and time.'}
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Training warning */}
        {anyTrainingRequired && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--danger)', display: 'flex', gap: 8 }}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span><strong>Training required</strong> — one or more selected instruments require training before use.</span>
          </div>
        )}

        {/* Conflict warning */}
        {conflicts.length > 0 && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--danger)' }}>
            🚫 <strong>Conflict detected</strong> — one or more instruments are already booked during this time.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Instrument picker ── */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Package size={13} /> Instruments
            </label>

            {/* Selected equipment pills */}
            {selectedEquipment.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {selectedEquipment.map(eq => (
                  <EquipmentPill key={eq.id} eq={eq} onRemove={selectedEquipment.length > 1 || isEdit ? removeEquipment : null} />
                ))}
              </div>
            )}

            {/* Search box */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input className="form-input" style={{ paddingLeft: 32 }}
                placeholder="Search to add another instrument..."
                value={equipSearch}
                onChange={e => setEquipSearch(e.target.value)} />
              {equipResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 20, marginTop: 4, maxHeight: 220, overflowY: 'auto' }}>
                  {equipResults.map(eq => (
                    <div key={eq.id} onClick={() => addEquipment(eq)}
                      style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: '#fff' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 14 }}>{eq.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{eq.asset_tag} · {eq.location}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {eq.approval_required && <span className="badge badge-yellow" style={{ fontSize: 10 }}>Approval</span>}
                          {eq.training_required  && <span className="badge badge-red"    style={{ fontSize: 10 }}>Training</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Booking title ── */}
          <div className="form-group">
            <label className="form-label">Booking Title</label>
            <input className="form-input"
              placeholder={defaultTitle || 'e.g. Experiment run 3 — HPLC + centrifuge'}
              value={title}
              onChange={e => setTitle(e.target.value)} />
            {!title && defaultTitle && (
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>Will use "{defaultTitle}" if left blank</div>
            )}
          </div>

          {/* ── Booking type ── */}
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

          {/* ── Dates ── */}
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

          {/* ── Time slot ── */}
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

          {/* ── Half day ── */}
          {bookingType === 'half_day' && (
            <div className="form-group">
              <label className="form-label">Which Half?</label>
              <select className="form-input" value={halfDay} onChange={e => setHalfDay(e.target.value)}>
                <option value="AM">Morning (8:00 AM – 12:00 PM)</option>
                <option value="PM">Afternoon (12:00 PM – 5:00 PM)</option>
              </select>
            </div>
          )}

          {/* ── Add users ── */}
          {!isEdit && (
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><UserPlus size={13} /> Add Other Users</label>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Search by name or email..."
                  value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                {userResults.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, marginTop: 4 }}>
                    {userResults.map(u => (
                      <div key={u.id} onClick={() => addUser(u)}
                        style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, borderBottom: '1px solid var(--border)', background: '#fff' }}
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
                  {additionalUsers.map(u => <UserPill key={u.id} u={u} onRemove={removeUser} />)}
                </div>
              )}
            </div>
          )}

          {/* ── Notes ── */}
          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <textarea className="form-input" rows={3} placeholder="Purpose, experiment details..."
              value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical' }} />
          </div>

          {/* ── ICS notice ── */}
          {!anyApprovalRequired && !isEdit && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--success)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <Download size={14} /> A .ics calendar invite will download automatically.
            </div>
          )}

          {/* ── Actions ── */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || conflicts.length > 0 || selectedEquipment.length === 0}>
              {loading
                ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                : isEdit ? 'Save Changes'
                : anyApprovalRequired ? 'Submit Request'
                : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
