import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

const STATUS_COLORS = { approved: 'var(--success)', pending: 'var(--warning)', rejected: 'var(--danger)', cancelled: 'var(--text-dim)' }

export default function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [bookings, setBookings] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const start = startOfMonth(currentMonth)
      const end = endOfMonth(currentMonth)
      const { data } = await supabase.from('bookings')
        .select('*, equipment(name, location), profiles(full_name)')
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .not('status', 'eq', 'cancelled')
      setBookings(data || [])
      setLoading(false)
    }
    load()
  }, [currentMonth])

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  const firstDayOfWeek = startOfMonth(currentMonth).getDay()
  const bookingsOnDay = (day) => bookings.filter(b => isSameDay(new Date(b.start_time), day))
  const selectedBookings = selectedDay ? bookingsOnDay(selectedDay) : []

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Calendar</h1>
          <p className="page-subtitle">All equipment reservations</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setCurrentMonth(m => subMonths(m, 1))}><ChevronLeft size={16} /></button>
          <span style={{ fontSize: 15, fontWeight: 600, minWidth: 140, textAlign: 'center' }}>{format(currentMonth, 'MMMM yyyy')}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setCurrentMonth(m => addMonths(m, 1))}><ChevronRight size={16} /></button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedDay ? '1fr 320px' : '1fr', gap: 20 }}>
        {/* Calendar */}
        <div className="card" style={{ padding: 20 }}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-dim)', fontWeight: 500, padding: '4px 0' }}>{d}</div>
            ))}
          </div>
          {/* Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {Array(firstDayOfWeek).fill(null).map((_, i) => <div key={'empty-' + i} />)}
            {days.map(day => {
              const dayBookings = bookingsOnDay(day)
              const isSelected = selectedDay && isSameDay(day, selectedDay)
              return (
                <div key={day.toISOString()} onClick={() => setSelectedDay(isSameDay(day, selectedDay) ? null : day)}
                  style={{ aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '6px 4px 4px', borderRadius: 8, cursor: 'pointer', border: '1px solid ' + (isSelected ? 'var(--accent)' : isToday(day) ? 'rgba(0,194,255,0.4)' : 'transparent'), background: isSelected ? 'var(--accent-glow)' : isToday(day) ? 'rgba(0,194,255,0.05)' : 'transparent', transition: 'all 0.15s', minHeight: 48 }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-elevated)' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isToday(day) ? 'rgba(0,194,255,0.05)' : 'transparent' }}>
                  <span style={{ fontSize: 13, fontWeight: isToday(day) ? 700 : 400, color: isSelected ? 'var(--accent)' : isToday(day) ? 'var(--accent)' : 'var(--text)' }}>
                    {format(day, 'd')}
                  </span>
                  {dayBookings.length > 0 && (
                    <div style={{ display: 'flex', gap: 2, marginTop: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {dayBookings.slice(0, 3).map((b, i) => (
                        <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLORS[b.status] || 'var(--accent)' }} />
                      ))}
                      {dayBookings.length > 3 && <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>+{dayBookings.length - 3}</span>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {loading && <div style={{ textAlign: 'center', marginTop: 16, color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>}
        </div>

        {/* Day detail panel */}
        {selectedDay && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>{format(selectedDay, 'EEEE, MMMM d')}</h3>
            {selectedBookings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                <Calendar size={28} style={{ marginBottom: 8, opacity: 0.3 }} />
                <div style={{ fontSize: 13 }}>No bookings this day</div>
              </div>
            ) : (
              selectedBookings.map(b => (
                <div key={b.id} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{b.equipment?.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{b.profiles?.full_name}</div>
                  <div style={{ fontSize: 11, fontFamily: 'Space Mono', color: 'var(--text-dim)', marginTop: 4 }}>
                    {format(new Date(b.start_time), 'h:mm a')} – {format(new Date(b.end_time), 'h:mm a')}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: STATUS_COLORS[b.status] + '20', color: STATUS_COLORS[b.status], border: '1px solid ' + STATUS_COLORS[b.status] + '40' }}>{b.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 6, textTransform: 'capitalize' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />{status}
          </div>
        ))}
      </div>
    </div>
  )
}
