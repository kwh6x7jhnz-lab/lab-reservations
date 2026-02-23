import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, isSameDay, parseISO
} from 'date-fns'

export default function CalendarPage() {
  const { user } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    fetchBookings()
  }, [currentDate])

  async function fetchBookings() {
    setLoading(true)
    const start = startOfMonth(currentDate)
    const end = endOfMonth(currentDate)

    const { data } = await supabase
      .from('bookings')
      .select('*, equipment(name, location)')
      .eq('user_id', user.id)
      .gte('start_time', start.toISOString())
      .lte('start_time', end.toISOString())
      .neq('status', 'cancelled')

    if (data) setBookings(data)
    setLoading(false)
  }

  const monthStart = startOfMonth(currentDate)
  const calStart = startOfWeek(monthStart)
  const calEnd = endOfWeek(endOfMonth(currentDate))
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const getBookingsForDay = (day) =>
    bookings.filter(b => isSameDay(parseISO(b.start_time), day))

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Calendar</h1>
      </div>

      <div className="calendar-wrap">
        {/* Month nav */}
        <div className="calendar-header">
          <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1))} className="btn btn-ghost btn-sm">
            <ChevronLeft size={18} />
          </button>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1))} className="btn btn-ghost btn-sm">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Day headers */}
        <div className="calendar-grid">
          {DAYS.map(d => <div key={d} className="calendar-day-header">{d}</div>)}
        </div>

        {/* Calendar cells */}
        <div className="calendar-grid">
          {days.map(day => {
            const dayBookings = getBookingsForDay(day)
            const inMonth = isSameMonth(day, currentDate)
            return (
              <div
                key={day.toISOString()}
                className={`calendar-cell ${isToday(day) ? 'today' : ''} ${!inMonth ? 'other-month' : ''}`}
              >
                <div className="day-num">{format(day, 'd')}</div>
                {dayBookings.slice(0, 3).map(b => (
                  <div
                    key={b.id}
                    className={`calendar-event ${b.status}`}
                    title={`${b.equipment?.name} — ${format(parseISO(b.start_time), 'h:mm a')}`}
                    onClick={() => setSelected(b)}
                  >
                    {b.equipment?.name}
                  </div>
                ))}
                {dayBookings.length > 3 && (
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', padding: '1px 4px' }}>
                    +{dayBookings.length - 3} more
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginTop: 16, fontSize: '0.78rem', color: 'var(--text-2)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, background: 'var(--accent)', borderRadius: 2, opacity: 0.7 }} /> Confirmed
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, background: 'var(--yellow)', borderRadius: 2, opacity: 0.7 }} /> Pending
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, background: 'var(--red)', borderRadius: 2, opacity: 0.7 }} /> Rejected
        </span>
      </div>

      {/* Booking detail popup */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{selected.equipment?.name}</div>
              <button onClick={() => setSelected(null)} className="btn btn-ghost btn-sm" style={{ padding: 6 }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.875rem' }}>
              <div><span style={{ color: 'var(--text-2)' }}>Date:</span> {format(parseISO(selected.start_time), 'EEEE, MMMM d, yyyy')}</div>
              <div><span style={{ color: 'var(--text-2)' }}>Time:</span> {format(parseISO(selected.start_time), 'h:mm a')} – {format(parseISO(selected.end_time), 'h:mm a')}</div>
              <div><span style={{ color: 'var(--text-2)' }}>Location:</span> {selected.equipment?.location}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--text-2)' }}>Status:</span>
                <span className={`badge ${selected.status === 'confirmed' ? 'badge-green' : selected.status === 'pending' ? 'badge-yellow' : 'badge-red'}`}>
                  {selected.status}
                </span>
              </div>
              {selected.notes && <div><span style={{ color: 'var(--text-2)' }}>Notes:</span> {selected.notes}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
