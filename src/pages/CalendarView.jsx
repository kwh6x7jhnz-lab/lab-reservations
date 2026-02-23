import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar, Filter } from 'lucide-react'

const STATUS_COLORS = { approved: '#0a7c4e', pending: '#b45309', rejected: '#c0392b', cancelled: '#8a9ab8' }
const STATUS_BG = { approved: '#f0fdf4', pending: '#fffbeb', rejected: '#fef2f2', cancelled: '#f8fafc' }

export default function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [bookings, setBookings] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [equipmentFilter, setEquipmentFilter] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [equipmentOptions, setEquipmentOptions] = useState([])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const start = startOfMonth(currentMonth).toISOString()
      const end = endOfMonth(currentMonth).toISOString()
      const { data, error } = await supabase
        .from('bookings')
        .select('*, equipment(name, location, floor_building, category, owner), profiles(full_name, email)')
        .gte('start_time', start)
        .lte('start_time', end)
        .in('status', ['approved', 'pending', 'rejected'])
      if (error) console.error('Calendar load error:', error)
      setBookings(data || [])
      setLoading(false)
    }
    load()
  }, [currentMonth])

  useEffect(() => {
    async function loadEquipment() {
      const { data } = await supabase.from('equipment').select('id, name').eq('is_active', true).order('name')
      setEquipmentOptions(data || [])
    }
    loadEquipment()
  }, [])

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  const firstDayOfWeek = startOfMonth(currentMonth).getDay()

  const filteredBookings = bookings.filter(b => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false
    if (equipmentFilter && b.equipment_id !== equipmentFilter) return false
    if (ownerFilter && !b.profiles?.full_name?.toLowerCase().includes(ownerFilter.toLowerCase())) return false
    return true
  })

  const bookingsOnDay = (day) => filteredBookings.filter(b => {
    const bookingDate = new Date(b.start_time)
    return isSameDay(bookingDate, day)
  })

  const selectedBookings = selectedDay ? bookingsOnDay(selectedDay) : []
  const activeFilters = (statusFilter !== 'all' ? 1 : 0) + (equipmentFilter ? 1 : 0) + (ownerFilter ? 1 : 0)

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Calendar</h1>
          <p className="page-subtitle">{filteredBookings.length} reservation{filteredBookings.length !== 1 ? 's' : ''} this month</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className={'btn btn-sm ' + (showFilters ? 'btn-primary' : 'btn-secondary')} onClick={() => setShowFilters(!showFilters)}>
            <Filter size={14} /> Filters {activeFilters > 0 ? `(${activeFilters})` : ''}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setCurrentMonth(m => subMonths(m, 1))}><ChevronLeft size={16} /></button>
          <span style={{ fontSize: 15, fontWeight: 600, minWidth: 140, textAlign: 'center' }}>{format(currentMonth, 'MMMM yyyy')}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setCurrentMonth(m => addMonths(m, 1))}><ChevronRight size={16} /></button>
        </div>
      </div>

      {showFilters && (
        <div className="card" style={{ marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
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
          <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
            <label className="form-label">Booked By</label>
            <input className="form-input" placeholder="Search name..." value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)} />
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => { setStatusFilter('all'); setEquipmentFilter(''); setOwnerFilter('') }}>Clear</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selectedDay ? '1fr 320px' : '1fr', gap: 20 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, padding: '4px 0' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {Array(firstDayOfWeek).fill(null).map((_, i) => <div key={'empty-' + i} />)}
            {days.map(day => {
              const dayBookings = bookingsOnDay(day)
              const isSelected = selectedDay && isSameDay(day, selectedDay)
              return (
                <div key={day.toISOString()} onClick={() => setSelectedDay(isSameDay(day, selectedDay) ? null : day)}
                  style={{ aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '6px 4px 4px', borderRadius: 8, cursor: 'pointer', border: '1px solid ' + (isSelected ? 'var(--accent)' : isToday(day) ? 'rgba(0,87,184,0.4)' : 'transparent'), background: isSelected ? 'var(--accent)' : isToday(day) ? 'rgba(0,87,184,0.06)' : 'transparent', transition: 'all 0.15s', minHeight: 48 }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-elevated)' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isToday(day) ? 'rgba(0,87,184,0.06)' : 'transparent' }}>
                  <span style={{ fontSize: 13, fontWeight: isToday(day) ? 700 : 400, color: isSelected ? '#fff' : isToday(day) ? 'var(--accent)' : 'var(--text)' }}>
                    {format(day, 'd')}
                  </span>
                  {dayBookings.length > 0 && (
                    <div style={{ display: 'flex', gap: 2, marginTop: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {dayBookings.slice(0, 3).map((b, i) => (
                        <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLORS[b.status] || 'var(--accent)' }} />
                      ))}
                      {dayBookings.length > 3 && <span style={{ fontSize: 9, color: isSelected ? '#fff' : 'var(--text-dim)' }}>+{dayBookings.length - 3}</span>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {loading && <div style={{ textAlign: 'center', marginTop: 16, color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>}
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
            {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''} loaded this month
          </div>
        </div>

        {selectedDay && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 600, overflowY: 'auto' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>{format(selectedDay, 'EEEE, MMMM d')}</h3>
            {selectedBookings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                <Calendar size={28} style={{ marginBottom: 8, opacity: 0.3 }} />
                <div style={{ fontSize: 13 }}>No bookings this day</div>
              </div>
            ) : selectedBookings.map(b => (
              <div key={b.id} style={{ padding: '12px', borderRadius: 8, background: STATUS_BG[b.status] || '#f8fafc', border: '1px solid ' + STATUS_COLORS[b.status] + '30' }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{b.equipment?.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{b.profiles?.full_name}</div>
                <div style={{ fontSize: 11, fontFamily: 'Space Mono', color: 'var(--text-dim)', marginTop: 4 }}>
                  {format(new Date(b.start_time), 'h:mm a')} – {format(new Date(b.end_time), 'h:mm a')}
                </div>
                {b.equipment?.location && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>📍 {b.equipment.location}</div>}
                {b.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>"{b.notes}"</div>}
                <div style={{ marginTop: 6 }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: STATUS_COLORS[b.status] + '20', color: STATUS_COLORS[b.status], border: '1px solid ' + STATUS_COLORS[b.status] + '40', textTransform: 'capitalize' }}>{b.status}</span>
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
      </div>
    </div>
  )
}
