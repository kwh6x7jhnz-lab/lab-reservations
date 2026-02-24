import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar, Filter, Plus } from 'lucide-react'
import BookingModal from '../components/booking/BookingModal'

const STATUS_COLORS = { approved: '#0a7c4e', pending: '#b45309', rejected: '#c0392b', cancelled: '#8a9ab8' }
const STATUS_BG     = { approved: '#dcfce7', pending: '#fef9c3', rejected: '#fee2e2', cancelled: '#f1f5f9' }
const HOURS         = Array.from({ length: 12 }, (_, i) => i + 7)
const HOUR_HEIGHT   = 64

function startOfWorkWeek(date) {
  const d = new Date(date), day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0,0,0,0); return d
}
function endOfWorkWeek(date) { return addDays(startOfWorkWeek(date), 4) }

function getBookingTop(st) {
  const d = new Date(st), h = d.getHours() + d.getMinutes() / 60
  return Math.max(0, (h - 7) * HOUR_HEIGHT)
}
function getBookingHeight(st, et) {
  return Math.max(HOUR_HEIGHT * 0.4, (new Date(et) - new Date(st)) / 3600000 * HOUR_HEIGHT)
}
function getTimeFromY(y, date) {
  const h = Math.floor(y / HOUR_HEIGHT) + 7
  const m = Math.round((y % HOUR_HEIGHT) / HOUR_HEIGHT * 4) * 15
  const d = new Date(date)
  d.setHours(Math.min(18, Math.max(7, h)), m === 60 ? 0 : m, 0, 0)
  return d
}

function layoutBookings(bookings) {
  if (!bookings.length) return []
  const sorted = [...bookings].sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
  const columns = []
  sorted.forEach(b => {
    const bStart = new Date(b.start_time)
    let placed = false
    for (let c = 0; c < columns.length; c++) {
      if (new Date(columns[c][columns[c].length - 1].end_time) <= bStart) {
        columns[c].push(b); placed = true; break
      }
    }
    if (!placed) columns.push([b])
  })
  return sorted.map(b => {
    const bStart = new Date(b.start_time), bEnd = new Date(b.end_time)
    const col = columns.findIndex(c => c.find(x => x.id === b.id))
    const overlappingCols = columns.filter(c => c.some(x => new Date(x.start_time) < bEnd && new Date(x.end_time) > bStart))
    return { booking: b, col, totalCols: overlappingCols.length }
  })
}

function bookingLabel(b) {
  if (b.title) return b.title
  const equip = b.allEquipment || []
  if (equip.length === 0) return b.equipment?.name || 'Booking'
  if (equip.length === 1) return equip[0].name
  return equip[0].name + ' +' + (equip.length - 1)
}

export default function CalendarView() {
  const { profile, isAdmin } = useAuth()
  const [view, setView]               = useState('day')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [bookings, setBookings]       = useState([])
  const [selectedDay, setSelectedDay] = useState(null)
  const [loading, setLoading]         = useState(false)
  const [reservationScope, setReservationScope] = useState('mine')
  const [statusFilter, setStatusFilter]   = useState('all')
  const [equipmentFilter, setEquipmentFilter] = useState('')
  const [showFilters, setShowFilters]     = useState(false)
  const [equipmentOptions, setEquipmentOptions] = useState([])
  const [favoriteIds, setFavoriteIds]     = useState([])
  const [bookingModalData, setBookingModalData] = useState(null)
  const [selectedEquipmentForNew, setSelectedEquipmentForNew] = useState(null)
  const [showNewBookingPanel, setShowNewBookingPanel] = useState(false)
  const [equipmentSearch, setEquipmentSearch] = useState('')
  const [editingBooking, setEditingBooking]   = useState(null)
  const [popover, setPopover]                 = useState(null)
  const dragRef   = useRef(null)
  const [dragState, setDragState] = useState(null)

  useEffect(() => {
    if (!profile?.id) return
    supabase.from('favorites').select('equipment_id').eq('user_id', profile.id)
      .then(({ data }) => setFavoriteIds((data || []).map(f => f.equipment_id)))
  }, [profile?.id])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const now = new Date(currentDate)
      let start, end
      if (view === 'month') {
        start = startOfMonth(now).toISOString(); end = endOfMonth(now).toISOString()
      } else if (view === 'week') {
        start = startOfWorkWeek(now).toISOString(); end = endOfWorkWeek(now).toISOString()
      } else {
        const d = new Date(now); d.setHours(0,0,0,0); start = d.toISOString()
        d.setHours(23,59,59,999); end = d.toISOString()
      }
      let query = supabase.from('bookings')
        .select('*, equipment:equipment_id(id,name,location,floor_building,category,approval_required,training_required)')
        .gte('start_time', start).lte('start_time', end)
        .in('status', ['approved','pending','rejected'])
      if (reservationScope === 'mine') query = query.eq('user_id', profile.id)
      else if (reservationScope === 'favorites') {
        if (!favoriteIds.length) { setBookings([]); setLoading(false); return }
        query = query.in('equipment_id', favoriteIds)
      }
      const { data, error } = await query
      if (error) { console.error(error); setLoading(false); return }
      const userIds = [...new Set((data||[]).map(b=>b.user_id))]
      let pmap = {}
      if (userIds.length) {
        const { data: ps } = await supabase.from('profiles').select('id,full_name,email').in('id',userIds)
        if (ps) ps.forEach(p => { pmap[p.id] = p })
      }
      const bids = (data||[]).map(b=>b.id)
      let emap = {}
      if (bids.length) {
        const { data: be } = await supabase.from('booking_equipment')
          .select('booking_id, equipment:equipment_id(id,name)').in('booking_id', bids)
        if (be) be.forEach(row => {
          if (!emap[row.booking_id]) emap[row.booking_id] = []
          if (row.equipment) emap[row.booking_id].push(row.equipment)
        })
      }
      setBookings((data||[]).map(b => ({
        ...b, profiles: pmap[b.user_id]||null,
        allEquipment: emap[b.id] || (b.equipment ? [b.equipment] : [])
      })))
      setLoading(false)
    }
    load()
  }, [currentDate, view, reservationScope, profile?.id, favoriteIds])

  useEffect(() => {
    supabase.from('equipment').select('*').eq('is_bookable', true).order('name')
      .then(({ data }) => setEquipmentOptions(data || []))
  }, [])

  const filteredBookings = bookings.filter(b => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false
    if (equipmentFilter && b.equipment_id !== equipmentFilter) return false
    return true
  })
  const bookingsOnDay = (day) => filteredBookings.filter(b => isSameDay(new Date(b.start_time), day))

  function navigate(dir) {
    if (view === 'month') setCurrentDate(d => dir>0 ? addMonths(d,1) : subMonths(d,1))
    else if (view === 'week') setCurrentDate(d => dir>0 ? addDays(d,7) : subDays(d,7))
    else setCurrentDate(d => dir>0 ? addDays(d,1) : subDays(d,1))
  }

  function getTitle() {
    if (view === 'month') return format(currentDate, 'MMMM yyyy')
    if (view === 'week') return format(startOfWorkWeek(currentDate),'MMM d') + ' – ' + format(endOfWorkWeek(currentDate),'MMM d, yyyy')
    return format(currentDate, 'EEEE, MMMM d, yyyy')
  }

  function openNewBooking(date, startTime, endTime) {
    setBookingModalData({ date, startTime, endTime })
    setSelectedEquipmentForNew(null); setEquipmentSearch(''); setShowNewBookingPanel(true)
  }
  function handleBookingClick(b, e) {
    e.stopPropagation()
    if (b.user_id === profile?.id || isAdmin) setEditingBooking(b)
  }
  function refreshBookings() { setCurrentDate(d => new Date(d)) }

  const filteredEquipmentOptions = equipmentOptions.filter(e =>
    !equipmentSearch || e.name.toLowerCase().includes(equipmentSearch.toLowerCase()) || e.asset_tag?.toLowerCase().includes(equipmentSearch.toLowerCase())
  )

  function handleGridMouseDown(e, day) {
    if (e.target !== e.currentTarget && !e.target.dataset.grid) return
    const rect = e.currentTarget.getBoundingClientRect(), y = e.clientY - rect.top
    const startTime = getTimeFromY(y, day)
    dragRef.current = { day, startY: y, startTime, rect }
    setDragState({ day, startY: y, endY: y, startTime, endTime: startTime })
  }
  function handleGridMouseMove(e) {
    if (!dragRef.current) return
    const y = e.clientY - dragRef.current.rect.top
    setDragState(prev => ({ ...prev, endY: y, endTime: getTimeFromY(y, dragRef.current.day) }))
  }
  function handleGridMouseUp() {
    if (!dragRef.current || !dragState) return
    const { startTime, endTime } = dragState
    const start = startTime < endTime ? startTime : endTime
    const end   = startTime < endTime ? endTime : startTime
    const diff  = (end - start) / 60000
    openNewBooking(dragRef.current.day, start, diff < 30 ? new Date(start.getTime() + 30*60000) : end)
    dragRef.current = null; setDragState(null)
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
          {Array(firstDayOfWeek).fill(null).map((_,i) => <div key={'e'+i} />)}
          {days.map(day => {
            const dayBookings = bookingsOnDay(day)
            const isSelected  = selectedDay && isSameDay(day, selectedDay)
            return (
              <div key={day.toISOString()} onClick={() => setSelectedDay(isSameDay(day, selectedDay) ? null : day)}
                style={{ minHeight: 72, display: 'flex', flexDirection: 'column', padding: '6px 4px 4px', borderRadius: 8, cursor: 'pointer', border: '1px solid '+(isSelected?'var(--accent)':isToday(day)?'rgba(0,87,184,0.4)':'var(--border)'), background: isSelected?'var(--accent-glow)':isToday(day)?'rgba(0,87,184,0.04)':'#fff', transition: 'all 0.15s' }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-elevated)' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isToday(day) ? 'rgba(0,87,184,0.04)' : '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: isToday(day)?700:400, color: isToday(day)?'var(--accent)':'var(--text)', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: isToday(day)?'var(--accent-glow)':'transparent' }}>
                    {format(day,'d')}
                  </span>
                  <button onClick={e => { e.stopPropagation(); openNewBooking(day,null,null) }}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'var(--accent)', padding:2, borderRadius:4, display:'flex', opacity:0, transition:'opacity 0.15s' }}
                    onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=0}>
                    <Plus size={12} />
                  </button>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                  {dayBookings.slice(0,2).map(b => (
                    <div key={b.id} onClick={e=>handleBookingClick(b,e)}
                      style={{ fontSize:11, padding:'2px 5px', borderRadius:4, background:STATUS_BG[b.status], color:STATUS_COLORS[b.status], overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', fontWeight:500, cursor:(b.user_id===profile?.id||isAdmin)?'pointer':'default' }}>
                      {format(new Date(b.start_time),'h:mma')} {bookingLabel(b)}
                    </div>
                  ))}
                  {dayBookings.length > 2 && (
                    <div style={{ fontSize:11, color:'var(--accent)', padding:'1px 5px', fontWeight:600, cursor:'pointer' }}
                      onClick={e => { e.stopPropagation(); setSelectedDay(day) }}>
                      +{dayBookings.length-2} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {loading && <div style={{ textAlign:'center', marginTop:12, color:'var(--text-muted)', fontSize:13 }}>Loading...</div>}
      </div>
    )
  }

  const TimeGridView = ({ days }) => (
    <div className="card" style={{ padding:0, overflow:'hidden' }}>
      <div style={{ display:'grid', gridTemplateColumns:'56px '+days.map(()=>'1fr').join(' '), borderBottom:'2px solid var(--border)' }}>
        <div style={{ borderRight:'1px solid var(--border)' }} />
        {days.map(day => (
          <div key={day.toISOString()} style={{ padding:'10px 8px', textAlign:'center', borderRight:'1px solid var(--border)', background:isToday(day)?'rgba(0,87,184,0.04)':'#fff' }}>
            <div style={{ fontSize:12, color:'var(--text-muted)', fontWeight:500 }}>{format(day,'EEE')}</div>
            <div style={{ fontSize:20, fontWeight:700, color:isToday(day)?'var(--accent)':'var(--text)', width:36, height:36, borderRadius:'50%', background:isToday(day)?'var(--accent-glow)':'transparent', display:'flex', alignItems:'center', justifyContent:'center', margin:'2px auto 0' }}>
              {format(day,'d')}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', overflowY:'auto', maxHeight:680 }}>
        <div style={{ width:56, flexShrink:0, borderRight:'1px solid var(--border)' }}>
          {HOURS.map(h => (
            <div key={h} style={{ height:HOUR_HEIGHT, display:'flex', alignItems:'flex-start', justifyContent:'flex-end', paddingRight:8, paddingTop:4, fontSize:11, color:'var(--text-dim)', borderBottom:'1px solid var(--border)', boxSizing:'border-box' }}>
              {format(new Date(new Date().setHours(h,0)),'ha')}
            </div>
          ))}
        </div>
        {days.map(day => {
          const dayBookings  = bookingsOnDay(day)
          const layout       = layoutBookings(dayBookings)
          const visibleLayout = layout.filter(item => item.col < 2)
          const hiddenLayout  = layout.filter(item => item.col >= 2)
          const isDragging    = dragState && isSameDay(dragState.day, day)
          const dragTop       = isDragging ? Math.min(dragState.startY, dragState.endY) : 0
          const dragHeight    = isDragging ? Math.abs(dragState.endY - dragState.startY) : 0
          return (
            <div key={day.toISOString()} style={{ flex:1, position:'relative', borderRight:'1px solid var(--border)', userSelect:'none' }}
              onMouseDown={e => handleGridMouseDown(e, day)}
              onMouseMove={handleGridMouseMove} onMouseUp={handleGridMouseUp}
              onMouseLeave={() => { if (dragRef.current) { dragRef.current=null; setDragState(null) } }}>
              {HOURS.map(h => (
                <div key={h} data-grid="1" style={{ height:HOUR_HEIGHT, borderBottom:'1px solid var(--border)', boxSizing:'border-box', background:h%2===0?'transparent':'rgba(0,0,0,0.01)', cursor:'crosshair' }}>
                  <div data-grid="1" style={{ height:'50%', borderBottom:'1px dashed rgba(0,0,0,0.06)' }} />
                </div>
              ))}
              {isDragging && dragHeight > 4 && (
                <div style={{ position:'absolute', top:dragTop, left:4, right:4, height:dragHeight, background:'rgba(0,87,184,0.12)', border:'2px solid var(--accent)', borderRadius:6, zIndex:5, pointerEvents:'none', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:11, color:'var(--accent)', fontWeight:600 }}>
                    {dragState.startTime && dragState.endTime
                      ? format(dragState.startTime<dragState.endTime?dragState.startTime:dragState.endTime,'h:mm a')+' – '+format(dragState.startTime<dragState.endTime?dragState.endTime:dragState.startTime,'h:mm a')
                      : ''}
                  </span>
                </div>
              )}
              {visibleLayout.map(({ booking: b, col, totalCols }) => {
                const cols  = Math.min(totalCols, 2)
                const w     = `calc(${100/cols}% - 6px)`
                const l     = `calc(${(col/cols)*100}% + 3px)`
                const canEdit = b.user_id===profile?.id || isAdmin
                return (
                  <div key={b.id}
                    style={{ position:'absolute', top:getBookingTop(b.start_time), left:l, width:w, height:getBookingHeight(b.start_time,b.end_time), background:STATUS_BG[b.status], border:'1px solid '+STATUS_COLORS[b.status]+'60', borderLeft:'3px solid '+STATUS_COLORS[b.status], borderRadius:6, padding:'3px 6px', overflow:'hidden', zIndex:3, cursor:canEdit?'pointer':'default', boxSizing:'border-box' }}
                    onMouseDown={e=>e.stopPropagation()} onClick={e=>handleBookingClick(b,e)}>
                    <div style={{ fontSize:11, fontWeight:600, color:STATUS_COLORS[b.status], overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{bookingLabel(b)}</div>
                    <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>{format(new Date(b.start_time),'h:mm')}–{format(new Date(b.end_time),'h:mma')}</div>
                    {getBookingHeight(b.start_time,b.end_time) > 44 && <div style={{ fontSize:10, color:'var(--text-dim)', marginTop:1, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{b.profiles?.full_name}</div>}
                    {canEdit && <div style={{ fontSize:9, color:STATUS_COLORS[b.status], marginTop:1, opacity:0.8 }}>click to edit</div>}
                  </div>
                )
              })}
              {hiddenLayout.length > 0 && (() => {
                const first = hiddenLayout[0].booking
                return (
                  <div style={{ position:'absolute', top:getBookingTop(first.start_time), right:4, zIndex:6, background:'var(--accent)', color:'#fff', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:10, cursor:'pointer', boxShadow:'0 2px 6px rgba(0,0,0,0.15)' }}
                    onMouseDown={e=>e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); setPopover({ bookings: hiddenLayout.map(l=>l.booking), x:e.clientX, y:e.clientY }) }}>
                    +{hiddenLayout.length}
                  </div>
                )
              })()}
            </div>
          )
        })}
      </div>
    </div>
  )

  const workWeekDays = eachDayOfInterval({ start: startOfWorkWeek(currentDate), end: endOfWorkWeek(currentDate) })

  return (
    <div className="page" onClick={() => setPopover(null)}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 className="page-title">Calendar</h1>
          <p className="page-subtitle">{filteredBookings.length} reservation{filteredBookings.length!==1?'s':''}</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <select className="form-input" style={{ width:'auto', fontSize:13 }} value={reservationScope} onChange={e=>setReservationScope(e.target.value)}>
            <option value="mine">My Reservations</option>
            <option value="favorites">Favorited Equipment</option>
            <option value="all">All Reservations</option>
          </select>
          <div style={{ display:'flex', background:'var(--bg-elevated)', borderRadius:8, padding:3, border:'1px solid var(--border)' }}>
            {['month','week','day'].map(v => (
              <button key={v} onClick={()=>setView(v)} style={{ padding:'5px 14px', borderRadius:6, border:'none', fontSize:13, fontWeight:500, cursor:'pointer', background:view===v?'#fff':'transparent', color:view===v?'var(--accent)':'var(--text-muted)', boxShadow:view===v?'0 1px 4px rgba(0,0,0,0.1)':'none', transition:'all 0.15s', textTransform:'capitalize' }}>
                {v==='week'?'Work Week':v}
              </button>
            ))}
          </div>
          <button className={'btn btn-sm '+(showFilters?'btn-primary':'btn-secondary')} onClick={()=>setShowFilters(!showFilters)}>
            <Filter size={14} /> Filters
          </button>
          <button className="btn btn-secondary btn-sm" onClick={()=>navigate(-1)}><ChevronLeft size={16}/></button>
          <span style={{ fontSize:14, fontWeight:600, minWidth:160, textAlign:'center' }}>{getTitle()}</span>
          <button className="btn btn-secondary btn-sm" onClick={()=>navigate(1)}><ChevronRight size={16}/></button>
          <button className="btn btn-secondary btn-sm" onClick={()=>setCurrentDate(new Date())}>Today</button>
        </div>
      </div>

      {showFilters && (
        <div className="card" style={{ marginBottom:16, display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-end' }}>
          <div className="form-group" style={{ flex:1, minWidth:160 }}>
            <label className="form-label">Status</label>
            <select className="form-input" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="form-group" style={{ flex:2, minWidth:200 }}>
            <label className="form-label">Equipment</label>
            <select className="form-input" value={equipmentFilter} onChange={e=>setEquipmentFilter(e.target.value)}>
              <option value="">All Equipment</option>
              {equipmentOptions.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={()=>{setStatusFilter('all');setEquipmentFilter('')}}>Clear</button>
        </div>
      )}

      {reservationScope==='favorites' && favoriteIds.length===0 ? (
        <div className="card" style={{ textAlign:'center', padding:'48px 24px', color:'var(--text-muted)' }}>
          <Calendar size={32} style={{ marginBottom:12, opacity:0.3 }}/>
          <div style={{ fontSize:15, fontWeight:500 }}>No favorited equipment yet</div>
          <div style={{ fontSize:13, marginTop:6 }}>Star equipment from the Equipment page to see their bookings here.</div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:selectedDay&&view==='month'?'1fr 300px':'1fr', gap:20 }}>
          <div>
            {view==='month' && <MonthView />}
            {view==='week'  && <TimeGridView days={workWeekDays} />}
            {view==='day'   && <TimeGridView days={[currentDate]} />}
          </div>
          {selectedDay && view==='month' && (
            <div className="card" style={{ display:'flex', flexDirection:'column', gap:12, maxHeight:600, overflowY:'auto' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <h3 style={{ fontSize:15, fontWeight:600 }}>{format(selectedDay,'EEEE, MMMM d')}</h3>
                <button className="btn btn-primary btn-sm" onClick={()=>openNewBooking(selectedDay,null,null)}><Plus size={14}/> Add</button>
              </div>
              {bookingsOnDay(selectedDay).length===0 ? (
                <div style={{ textAlign:'center', padding:'24px 0', color:'var(--text-muted)' }}>
                  <Calendar size={28} style={{ marginBottom:8, opacity:0.3 }}/>
                  <div style={{ fontSize:13 }}>No bookings this day</div>
                </div>
              ) : bookingsOnDay(selectedDay).map(b => {
                const canEdit = b.user_id===profile?.id || isAdmin
                return (
                  <div key={b.id} onClick={()=>canEdit&&setEditingBooking(b)}
                    style={{ padding:12, borderRadius:8, background:STATUS_BG[b.status], border:'1px solid '+STATUS_COLORS[b.status]+'40', cursor:canEdit?'pointer':'default' }}>
                    <div style={{ fontWeight:600, fontSize:14 }}>{bookingLabel(b)}</div>
                    <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{b.profiles?.full_name||'Unknown'}</div>
                    <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:4 }}>{format(new Date(b.start_time),'h:mm a')} – {format(new Date(b.end_time),'h:mm a')}</div>
                    {b.allEquipment?.length>1 && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>📦 {b.allEquipment.map(e=>e.name).join(', ')}</div>}
                    <div style={{ marginTop:6, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10, background:STATUS_COLORS[b.status]+'20', color:STATUS_COLORS[b.status], textTransform:'capitalize' }}>{b.status}</span>
                      {canEdit && <span style={{ fontSize:11, color:'var(--accent)' }}>click to edit</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div style={{ display:'flex', gap:16, marginTop:16, fontSize:12, color:'var(--text-muted)', flexWrap:'wrap' }}>
        {Object.entries(STATUS_COLORS).map(([s,c]) => (
          <div key={s} style={{ display:'flex', alignItems:'center', gap:6, textTransform:'capitalize' }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:c }}/>{s}
          </div>
        ))}
        <span style={{ color:'var(--text-dim)', marginLeft:8 }}>· Click or drag on week/day view to create · Click your booking to edit</span>
      </div>

      {popover && (
        <div onClick={e=>e.stopPropagation()}
          style={{ position:'fixed', top:popover.y, left:popover.x, zIndex:100, background:'#fff', border:'1px solid var(--border)', borderRadius:10, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', padding:12, minWidth:220, maxWidth:300 }}>
          <div style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>More bookings</div>
          {popover.bookings.map(b => {
            const canEdit = b.user_id===profile?.id || isAdmin
            return (
              <div key={b.id} onClick={()=>{ if(canEdit){setEditingBooking(b);setPopover(null)} }}
                style={{ padding:'8px 10px', borderRadius:7, marginBottom:4, background:STATUS_BG[b.status], border:'1px solid '+STATUS_COLORS[b.status]+'40', cursor:canEdit?'pointer':'default' }}>
                <div style={{ fontSize:13, fontWeight:600, color:STATUS_COLORS[b.status] }}>{bookingLabel(b)}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{format(new Date(b.start_time),'h:mm a')} – {format(new Date(b.end_time),'h:mm a')}</div>
              </div>
            )
          })}
        </div>
      )}

      {showNewBookingPanel && (
        <div className="modal-overlay" onClick={()=>setShowNewBookingPanel(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{ maxWidth:480 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontSize:18, fontWeight:600 }}>New Booking</h2>
              <button className="btn btn-ghost btn-sm" onClick={()=>setShowNewBookingPanel(false)}>✕</button>
            </div>
            <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:16 }}>
              📅 {bookingModalData?.date ? format(new Date(bookingModalData.date),'EEEE, MMMM d') : ''}
              {bookingModalData?.startTime && bookingModalData?.endTime && (
                <span style={{ marginLeft:8 }}>🕐 {format(new Date(bookingModalData.startTime),'h:mm a')} – {format(new Date(bookingModalData.endTime),'h:mm a')}</span>
              )}
            </div>
            <div className="form-group" style={{ marginBottom:16 }}>
              <label className="form-label">Search Equipment</label>
              <input className="form-input" placeholder="Type to search..." value={equipmentSearch} onChange={e=>setEquipmentSearch(e.target.value)} autoFocus />
            </div>
            <div style={{ maxHeight:300, overflowY:'auto', border:'1px solid var(--border)', borderRadius:8 }}>
              {filteredEquipmentOptions.length===0 ? (
                <div style={{ padding:20, textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>No equipment found</div>
              ) : filteredEquipmentOptions.slice(0,50).map(eq => (
                <div key={eq.id} onClick={()=>{ setSelectedEquipmentForNew(eq); setShowNewBookingPanel(false) }}
                  style={{ padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fff' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--bg-elevated)'}
                  onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                  <div>
                    <div style={{ fontWeight:500, fontSize:14 }}>{eq.name}</div>
                    <div style={{ fontSize:12, color:'var(--text-muted)' }}>{eq.asset_tag} · {eq.location}</div>
                  </div>
                  <div style={{ display:'flex', gap:4 }}>
                    {eq.approval_required && <span className="badge badge-yellow" style={{ fontSize:10 }}>Approval</span>}
                    {eq.training_required  && <span className="badge badge-red"    style={{ fontSize:10 }}>Training</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedEquipmentForNew && (
        <BookingModal equipment={selectedEquipmentForNew}
          prefillDate={bookingModalData?.date} prefillStartTime={bookingModalData?.startTime} prefillEndTime={bookingModalData?.endTime}
          onClose={()=>{ setSelectedEquipmentForNew(null); setBookingModalData(null); refreshBookings() }} />
      )}
      {editingBooking && (
        <BookingModal equipment={editingBooking.equipment} editBooking={editingBooking}
          onClose={()=>{ setEditingBooking(null); refreshBookings() }} />
      )}
    </div>
  )
}
