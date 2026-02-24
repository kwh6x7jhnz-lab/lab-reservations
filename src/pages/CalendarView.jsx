import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, subDays } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar, Filter, Plus } from 'lucide-react'
import BookingModal from '../components/booking/BookingModal'

const STATUS_COLORS = { approved: '#0a7c4e', pending: '#b45309', rejected: '#c0392b', cancelled: '#8a9ab8' }
const STATUS_BG = { approved: '#dcfce7', pending: '#fef9c3', rejected: '#fee2e2', cancelled: '#f1f5f9' }
const HOURS = Array.from({ length: 10 }, (_, i) => i + 8)
const HOUR_HEIGHT = 64

function getBookingTop(startTime) {
  const d = new Date(startTime)
  const hours = d.getHours() + d.getMinutes() / 60
  return Math.max(0, (hours - 8) * HOUR_HEIGHT)
}

function getBookingHeight(startTime, endTime) {
  const start = new Date(startTime)
  const end = new Date(endTime)
  const duration = (end - start) / (1000 * 60 * 60)
  return Math.max(HOUR_HEIGHT * 0.4, duration * HOUR_HEIGHT)
}

function getTimeFromY(y, date) {
  const hour = Math.floor(y / HOUR_HEIGHT) + 8
  const minute = Math.round((y % HOUR_HEIGHT) / HOUR_HEIGHT * 4) * 15
  const d = new Date(date)
  d.setHours(Math.min(17, Math.max(8, hour)), minute === 60 ? 0 : minute, 0, 0)
  return d
}

export default function CalendarView() {
  const { profile, isAdmin } = useAuth()
  const [view, setView] = useState('day')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [bookings, setBookings] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)
  const [loading, setLoading] = useState(false)
  const [reservationScope, setReservationScope] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [equipmentFilter, setEquipmentFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [equipmentOptions, setEquipmentOptions] = useState([])
  const [bookingModalData, setBookingModalData] = useState(null)
  const [selectedEquipmentForNew, setSelectedEquipmentForNew] = useState(null)
  const [showNewBookingPanel, setShowNewBookingPanel] = useState(false)
  const [equipmentSearch, setEquipmentSearch] = useState('')
  const [editingBooking, setEditingBooking] = useState(null)
  const dragRef = useRef(null)
  const [dragState, setDragState] = useState(null)

  useEffect(() => {
    if (profile && reservationScope === null) {
      setReservationScope(isAdmin ? 'all' : 'mine')
    }
  }, [profile, isAdmin])

  useEffect(() => {
    if (reservationScope === null) return
    async function load() {
      setLoading(true)
      const now = new Date(currentDate)
      let start, end
      if (view === 'month') {
        start = startOfMonth(now).toISOString()
        end = endOfMonth(now).toISOString()
      } else if (view === 'week') {
        start = startOfWeek(now).toISOString()
        end = endOfWeek(now).toISOString()
      } else {
        const d = new Date(now)
        d.setHours(0,0,0,0); start = d.toISOString()
        d.setHours(23,59,59,999); end = d.toISOString()
      }

      let query = supabase.from('bookings')
        .select('*, equipment(id, name, location, floor_building, category, owner, approval_required, training_required)')
        .gte('start_time', start)
        .lte('start_time', end)
        .in('status', ['approved', 'pending', 'rejected'])

      if (reservationScope === 'mine') query = query.eq('user_id', profile.id)

      const { data, error } = await query
      if (error) { console.error('Calendar load error:', error); setLoading(false); return }

      const userIds = [...new Set((data || []).map(b => b.user_id))]
      let profileMap = {}
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds)
        if (profiles) profiles.forEach(p => { profileMap[p.id] = p })
      }

      setBookings((data || []).map(b => ({ ...b, profiles: profileMap[b.user_id] || null })))
      setLoading(false)
    }
    load()
  }, [currentDate, view, reservationScope, profile])

  useEffect(() => {
    async function loadEquipment() {
      const { data } = await supabase.from('equipment').select('*').eq('is_active', true).order('name')
      setEquipmentOptions(data || [])
    }
    loadEquipment()
  }, [])

  const filteredBookings = bookings.filter(b => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false
    if (equipmentFilter && b.equipment_id !== equipmentFilter) return false
    return true
  })

  const bookingsOnDay = (day) => filteredBookings.filter(b => isSameDay(new Date(b.start_time), day))

  function navigate(dir) {
    if (view === 'month') setCurrentDate(d => dir > 0 ? addMonths(d, 1) : subMonths(d, 1))
    else if (view === 'week') setCurrentDate(d => dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1))
    else setCurrentDate(d => dir > 0 ? addDays(d, 1) : subDays(d, 1))
  }

  function getTitle() {
    if (view === 'month') return format(currentDate, 'MMMM yyyy')
    if (view === 'week') {
      const s = startOfWeek(currentDate), e = endOfWeek(currentDate)
      return format(s, 'MMM d') + ' – ' + format(e, 'MMM d, yyyy')
    }
    return format(currentDate, 'EEEE, MMMM d, yyyy')
  }

  function openNewBooking(date, startTime, endTime) {
    setBookingModalData({ date, startTime, endTime })
    setSelectedEquipmentForNew(null)
    setEquipmentSearch('')
    setShowNewBookingPanel(true)
  }

  function handleBookingClick(b, e) {
    e.stopPropagation()
    // Owner can always edit; admins can edit any booking
    if (b.user_id === profile?.id || isAdmin) {
      setEditingBooking(b)
    }
  }

  function refreshBookings() {
    setCurrentDate(d => new Date(d))
  }

  const filteredEquipmentOptions = equipmentOptions.filter(e =>
    !equipmentSearch || e.name.toLowerCase().includes(equipmentSearch.toLowerCase()) || e.asset_tag?.toLowerCase().includes(equipmentSearch.toLowerCase())
  )

  function handleGridMouseDown(e, day) {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const startTime = getTimeFromY(y, day)
    dragRef.current = { day, startY: y, startTime, rect }
    setDragState({ day, startY: y, endY: y, startTime, endTime: startTime })
  }

  function handleGridMouseMove(e) {
    if (!dragRef.current) return
    const y = e.clientY - dragRef.current.rect.top
    const endTime = getTimeFromY(y, dragRef.current.day)
    setDragState(prev => ({ ...prev, endY: y, endTime }))
  }

  function handleGridMouseUp() {
    if (!dragRef.current || !dragState) return
    const { startTime, endTime, day } = dragState
    const start = startTime < endTime ? startTime : endTime
    const end = startTime < endTime ? endTime : startTime
    const diff = (end - start) / 60000
    const finalEnd = diff < 30 ? new Date(start.getTime() + 30 * 60000) : end
    openNewBooking(day, start, finalEnd)
    dragRef.current = null
    setDragState(null)
  }

  const MonthView = () => {
    const days = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) })
    const firstDayOfWeek = startOfMonth(currentDate).getDay()
    return (
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, padding: '4px 0' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {Array(firstDayOfWeek).fill(null).map((_, i) => <div key={'e'+i} />)}
          {days.map(day => {
            const dayBookings = bookingsOnDay(day)
            const isSelected = selectedDay && isSameDay(day, selectedDay)
            return (
              <div key={day.toISOString()} onClick={() => setSelectedDay(isSameDay(day, selectedDay) ? null : day)}
                style={{ minHeight: 72, display: 'flex', flexDirection: 'column', padding: '6px 4px 4px', borderRadius: 8, cursor: 'pointer', border: '1px solid ' + (isSelected ? 'var(--accent)' : isToday(day) ? 'rgba(0,87,184,0.4)' : 'var(--border)'), background: isSelected ? 'var(--accent-glow)' : isToday(day) ? 'rgba(0,87,184,0.04)' : '#fff', transition: 'all 0.15s' }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-elevated)' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isToday(day) ? 'rgba(0,87,184,0.04)' : '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: isToday(day) ? 700 : 400, color: isToday(day) ? 'var(--accent)' : 'var(--text)', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: isToday(day) ? 'var(--accent-glow)' : 'transparent' }}>
                    {format(day, 'd')}
                  </span>
                  <button onClick={e => { e.stopPropagation(); openNewBooking(day, null, null) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 2, borderRadius: 4, display: 'flex', opacity: 0, transition: 'opacity 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = 1}
                    onMouseLeave={e => e.currentTarget.style.opacity = 0}
                    title="Add booking">
                    <Plus size={12} />
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {dayBookings.slice(0, 2).map(b => (
                    <div key={b.id}
                      onClick={e => handleBookingClick(b, e)}
                      style={{ fontSize: 11, padding: '2px 5px', borderRadius: 4, background: STATUS_BG[b.status], color: STATUS_COLORS[b.status], overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontWeight: 500, cursor: (b.user_id === profile?.id || isAdmin) ? 'pointer' : 'default', border: (b.user_id === profile?.id || isAdmin) ? '1px solid ' + STATUS_COLORS[b.status] + '60' : 'none' }}>
                      {format(new Date(b.start_time), 'h:mma')} {b.equipment?.name}
                    </div>
                  ))}
                  {dayBookings.length > 2 && <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '1px 5px' }}>+{dayBookings.length - 2} more</div>}
                </div>
              </div>
            )
          })}
        </div>
        {loading && <div style={{ textAlign: 'center', marginTop: 12, color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>}
      </div>
    )
  }

  const TimeGridView = ({ days }) => (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '56px ' + days.map(() => '1fr').join(' '), borderBottom: '2px solid var(--border)' }}>
        <div style={{ borderRight: '1px solid var(--border)' }} />
        {days.map(day => (
          <div key={day.toISOString()} style={{ padding: '10px 8px', textAlign: 'center', borderRight: '1px solid var(--border)', background: isToday(day) ? 'rgba(0,87,184,0.04)' : '#fff' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{format(day, 'EEE')}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: isToday(day) ? 'var(--accent)' : 'var(--text)', width: 36, height: 36, borderRadius: '50%', background: isToday(day) ? 'var(--accent-glow)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '2px auto 0' }}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', overflowY: 'auto', maxHeight: 600 }}>
        <div style={{ width: 56, flexShrink: 0, borderRight: '1px solid var(--border)' }}>
          {HOURS.map(h => (
            <div key={h} style={{ height: HOUR_HEIGHT, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 8, paddingTop: 4, fontSize: 11, color: 'var(--text-dim)', borderBottom: '1px solid var(--border)', boxSizing: 'border-box' }}>
              {format(new Date(new Date().setHours(h, 0)), 'ha')}
            </div>
          ))}
        </div>
        {days.map(day => {
          const dayBookings = bookingsOnDay(day)
          const isDragging = dragState && isSameDay(dragState.day, day)
          const dragTop = isDragging ? Math.min(dragState.startY, dragState.endY) : 0
          const dragHeight = isDragging ? Math.abs(dragState.endY - dragState.startY) : 0
          return (
            <div key={day.toISOString()} style={{ flex: 1, position: 'relative', borderRight: '1px solid var(--border)', cursor: 'crosshair', userSelect: 'none' }}
              onMouseDown={e => handleGridMouseDown(e, day)}
              onMouseMove={handleGridMouseMove}
              onMouseUp={handleGridMouseUp}
              onMouseLeave={() => { if (dragRef.current) { dragRef.current = null; setDragState(null) } }}>
              {HOURS.map(h => (
                <div key={h} style={{ height: HOUR_HEIGHT, borderBottom: '1px solid var(--border)', boxSizing: 'border-box', background: h % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)' }}>
                  <div style={{ height: '50%', borderBottom: '1px dashed rgba(0,0,0,0.06)' }} />
                </div>
              ))}
              {isDragging && dragHeight > 4 && (
                <div style={{ position: 'absolute', top: dragTop, left: 4, right: 4, height: dragHeight, background: 'rgba(0,87,184,0.12)', border: '2px solid var(--accent)', borderRadius: 6, zIndex: 5, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>
                    {dragState.startTime && dragState.endTime ? format(dragState.startTime < dragState.endTime ? dragState.startTime : dragState.endTime, 'h:mm a') + ' – ' + format(dragState.startTime < dragState.endTime ? dragState.endTime : dragState.startTime, 'h:mm a') : ''}
                  </span>
                </div>
              )}
              {dayBookings.map(b => (
                <div key={b.id}
                  style={{ position: 'absolute', top: getBookingTop(b.start_time), left: 4, right: 4, height: getBookingHeight(b.start_time, b.end_time), background: STATUS_BG[b.status], border: '1px solid ' + STATUS_COLORS[b.status] + '60', borderLeft: '3px solid ' + STATUS_COLORS[b.status], borderRadius: 6, padding: '3px 6px', overflow: 'hidden', zIndex: 3, cursor: (b.user_id === profile?.id || isAdmin) ? 'pointer' : 'default' }}
                  onMouseDown={e => e.stopPropagation()}
                  onClick={e => handleBookingClick(b, e)}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: STATUS_COLORS[b.status], overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{b.equipment?.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{format(new Date(b.start_time), 'h:mm')}–{format(new Date(b.end_time), 'h:mma')}</div>
                  {getBookingHeight(b.start_time, b.end_time) > 40 && <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{b.profiles?.full_name}</div>}
                  {(b.user_id === profile?.id || isAdmin) && <div style={{ fontSize: 9, color: STATUS_COLORS[b.status], marginTop: 1, opacity: 0.8 }}>click to edit</div>}
                </div>
              ))}
              <div style={{ position: 'absolute', inset: 0, zIndex: 1 }} onClick={e => {
                if (dragRef.current) return
                const rect = e.currentTarget.getBoundingClientRect()
                const y = e.clientY - rect.top
                const startTime = getTimeFromY(y, day)
                const endTime = new Date(startTime.getTime() + 60 * 60000)
                openNewBooking(day, startTime, endTime)
              }} />
            </div>
          )
        })}
      </div>
    </div>
  )

  const weekDays = eachDayOfInterval({ start: startOfWeek(currentDate), end: endOfWeek(currentDate) })

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Calendar</h1>
          <p className="page-subtitle">{filteredBookings.length} reservation{filteredBookings.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="form-input" style={{ width: 'auto', fontSize: 13 }} value={reservationScope || 'mine'} onChange={e => setReservationScope(e.target.value)}>
            <option value="mine">My Reservations</option>
            <option value="all">All Reservations</option>
          </select>
          <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: 8, padding: 3, border: '1px solid var(--border)' }}>
            {['month','week','day'].map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '5px 14px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', background: view === v ? '#fff' : 'transparent', color: view === v ? 'var(--accent)' : 'var(--text-muted)', boxShadow: view === v ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s', textTransform: 'capitalize' }}>
                {v}
              </button>
            ))}
          </div>
          <button className={'btn btn-sm ' + (showFilters ? 'btn-primary' : 'btn-secondary')} onClick={() => setShowFilters(!showFilters)}>
            <Filter size={14} /> Filters
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}><ChevronLeft size={16} /></button>
          <span style={{ fontSize: 14, fontWeight: 600, minWidth: 160, textAlign: 'center' }}>{getTitle()}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(1)}><ChevronRight size={16} /></button>
          <button className="btn btn-secondary btn-sm" onClick={() => setCurrentDate(new Date())}>Today</button>
        </div>
      </div>

      {showFilters && (
        <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
            <label className="form-label">Status</label>
            <select className="form-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: 2, minWidth: 200 }}>
            <label className="form-label">Equipment</label>
            <select className="form-input" value={equipmentFilter} onChange={e => setEquipmentFilter(e.target.value)}>
              <option value="">All Equipment</option>
              {equipmentOptions.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => { setStatusFilter('all'); setEquipmentFilter('') }}>Clear</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selectedDay && view === 'month' ? '1fr 300px' : '1fr', gap: 20 }}>
        <div>
          {view === 'month' && <MonthView />}
          {view === 'week' && <TimeGridView days={weekDays} />}
          {view === 'day' && <TimeGridView days={[currentDate]} />}
        </div>

        {selectedDay && view === 'month' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 600, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 15, fontWeight: 600 }}>{format(selectedDay, 'EEEE, MMMM d')}</h3>
              <button className="btn btn-primary btn-sm" onClick={() => openNewBooking(selectedDay, null, null)}><Plus size={14} /> Add</button>
            </div>
            {bookingsOnDay(selectedDay).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                <Calendar size={28} style={{ marginBottom: 8, opacity: 0.3 }} />
                <div style={{ fontSize: 13 }}>No bookings this day</div>
              </div>
            ) : bookingsOnDay(selectedDay).map(b => (
              <div key={b.id}
                onClick={() => (b.user_id === profile?.id || isAdmin) && setEditingBooking(b)}
                style={{ padding: '12px', borderRadius: 8, background: STATUS_BG[b.status], border: '1px solid ' + STATUS_COLORS[b.status] + '40', cursor: (b.user_id === profile?.id || isAdmin) ? 'pointer' : 'default' }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{b.equipment?.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{b.profiles?.full_name || 'Unknown'}</div>
                <div style={{ fontSize: 11, fontFamily: 'Space Mono', color: 'var(--text-dim)', marginTop: 4 }}>
                  {format(new Date(b.start_time), 'h:mm a')} – {format(new Date(b.end_time), 'h:mm a')}
                </div>
                {b.equipment?.location && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>📍 {b.equipment.location}</div>}
                <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: STATUS_COLORS[b.status] + '20', color: STATUS_COLORS[b.status], border: '1px solid ' + STATUS_COLORS[b.status] + '40', textTransform: 'capitalize' }}>{b.status}</span>
                  {(b.user_id === profile?.id || isAdmin) && <span style={{ fontSize: 11, color: 'var(--accent)' }}>click to edit</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 16, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 6, textTransform: 'capitalize' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />{status}
          </div>
        ))}
        <span style={{ color: 'var(--text-dim)', marginLeft: 8 }}>· Click or drag on week/day view to create a booking · Click your booking to edit</span>
      </div>

      {showNewBookingPanel && (
        <div className="modal-overlay" onClick={() => setShowNewBookingPanel(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600 }}>New Booking</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowNewBookingPanel(false)}>✕</button>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              📅 {bookingModalData?.date ? format(new Date(bookingModalData.date), 'EEEE, MMMM d') : ''}
              {bookingModalData?.startTime && bookingModalData?.endTime && (
                <span style={{ marginLeft: 8 }}>🕐 {format(new Date(bookingModalData.startTime), 'h:mm a')} – {format(new Date(bookingModalData.endTime), 'h:mm a')}</span>
              )}
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Search Equipment</label>
              <input className="form-input" placeholder="Type to search by name or asset tag..." value={equipmentSearch} onChange={e => setEquipmentSearch(e.target.value)} autoFocus />
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
              {filteredEquipmentOptions.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No equipment found</div>
              ) : filteredEquipmentOptions.slice(0, 50).map(eq => (
                <div key={eq.id} onClick={() => { setSelectedEquipmentForNew(eq); setShowNewBookingPanel(false) }}
                  style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{eq.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{eq.asset_tag} · {eq.location}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {eq.approval_required && <span className="badge badge-yellow" style={{ fontSize: 10 }}>Approval</span>}
                    {eq.training_required && <span className="badge badge-red" style={{ fontSize: 10 }}>Training</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedEquipmentForNew && (
        <BookingModal
          equipment={selectedEquipmentForNew}
          prefillDate={bookingModalData?.date}
          prefillStartTime={bookingModalData?.startTime}
          prefillEndTime={bookingModalData?.endTime}
          onClose={() => {
            setSelectedEquipmentForNew(null)
            setBookingModalData(null)
            refreshBookings()
          }}
        />
      )}

      {editingBooking && (
        <BookingModal
          equipment={editingBooking.equipment}
          editBooking={editingBooking}
          onClose={() => {
            setEditingBooking(null)
            refreshBookings()
          }}
        />
      )}
    </div>
  )
}
