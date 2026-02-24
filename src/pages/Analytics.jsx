import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { BarChart2, Clock, Package, TrendingUp, Calendar, Users, Award, Filter, X } from 'lucide-react'
import { format, subDays, eachDayOfInterval } from 'date-fns'

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = 'var(--accent)' }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ─── CSS bar chart ────────────────────────────────────────────────────────────
function BarChart({ data, labelKey, valueKey, color = 'var(--accent)', height = 160 }) {
  const max = Math.max(...data.map(d => d[valueKey]), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height, paddingBottom: 24, position: 'relative' }}>
      {data.map((d, i) => {
        const pct = (d[valueKey] / max) * 100
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 4 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{d[valueKey] || ''}</div>
            <div style={{ width: '100%', background: color, borderRadius: '4px 4px 0 0', height: `${pct}%`, minHeight: d[valueKey] ? 4 : 0, transition: 'height 0.4s ease', opacity: 0.85 }} title={`${d[labelKey]}: ${d[valueKey]}`} />
            <div style={{ fontSize: 10, color: 'var(--text-dim)', textAlign: 'center', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', position: 'absolute', bottom: 0 }}>{d[labelKey]}</div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Horizontal bar ranking ───────────────────────────────────────────────────
function HorizBar({ label, value, max, color = 'var(--accent)', rank }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
      <div style={{ width: 20, fontSize: 12, color: 'var(--text-dim)', textAlign: 'right', fontWeight: 600 }}>{rank}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>{label}</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>{value} booking{value !== 1 ? 's' : ''}</span>
        </div>
        <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.5s ease' }} />
        </div>
      </div>
    </div>
  )
}

// ─── Filter pill ──────────────────────────────────────────────────────────────
function FilterPill({ label, onRemove }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--accent-glow)', border: '1px solid rgba(208,33,42,0.2)', borderRadius: 20, padding: '3px 10px', fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>
      {label}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 0, display: 'flex', marginLeft: 2 }}><X size={11} /></button>
    </div>
  )
}

const COLORS = ['var(--accent)', '#0057b8', '#059669', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#65a30d']

export default function Analytics() {
  const [range, setRange] = useState('30')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [showFilters, setShowFilters] = useState(false)

  // Filter state
  const [categoryFilter, setCategoryFilter]         = useState('')
  const [statusFilter, setStatusFilter]             = useState('')
  const [equipmentFilter, setEquipmentFilter]       = useState('')
  const [floorFilter, setFloorFilter]               = useState('')
  const [bookingTypeFilter, setBookingTypeFilter]   = useState('')

  // Option lists for dropdowns
  const [categoryOptions, setCategoryOptions]       = useState([])
  const [equipmentOptions, setEquipmentOptions]     = useState([])
  const [floorOptions, setFloorOptions]             = useState([])

  // Load dropdown options once
  useEffect(() => {
    async function loadOptions() {
      const { data } = await supabase.from('equipment').select('id, name, category, floor_building').order('name')
      if (!data) return
      setCategoryOptions([...new Set(data.map(e => e.category).filter(Boolean))].sort())
      setFloorOptions([...new Set(data.map(e => e.floor_building).filter(Boolean))].sort())
      setEquipmentOptions(data)
    }
    loadOptions()
  }, [])

  useEffect(() => {
    loadAnalytics()
  }, [range, categoryFilter, statusFilter, equipmentFilter, floorFilter, bookingTypeFilter])

  // Count active filters
  const activeFilterCount = [categoryFilter, statusFilter, equipmentFilter, floorFilter, bookingTypeFilter].filter(Boolean).length

  function clearAllFilters() {
    setCategoryFilter('')
    setStatusFilter('')
    setEquipmentFilter('')
    setFloorFilter('')
    setBookingTypeFilter('')
  }

  async function loadAnalytics() {
    setLoading(true)
    try {
      const days = parseInt(range)
      const since = subDays(new Date(), days).toISOString()

      let query = supabase
        .from('bookings')
        .select('id, start_time, end_time, status, booking_type, equipment_id, user_id, equipment:equipment_id(name, category, location, floor_building)')
        .gte('start_time', since)
        .order('start_time', { ascending: true })

      // Apply filters at query level where possible
      if (statusFilter)      query = query.eq('status', statusFilter)
      if (bookingTypeFilter) query = query.eq('booking_type', bookingTypeFilter)
      if (equipmentFilter)   query = query.eq('equipment_id', equipmentFilter)

      const { data: bookings } = await query
      if (!bookings) { setLoading(false); return }

      // Client-side filters for joined fields
      let filtered = bookings
      if (categoryFilter) filtered = filtered.filter(b => b.equipment?.category === categoryFilter)
      if (floorFilter)    filtered = filtered.filter(b => b.equipment?.floor_building === floorFilter)

      const approved = filtered.filter(b => b.status === 'approved')
      const pending  = filtered.filter(b => b.status === 'pending')
      const total    = filtered.length

      const totalHours = approved.reduce((sum, b) => {
        return sum + (new Date(b.end_time) - new Date(b.start_time)) / 3600000
      }, 0)

      const uniqueEquipment = new Set(approved.map(b => b.equipment_id)).size
      const uniqueUsers     = new Set(filtered.map(b => b.user_id)).size

      // Bookings per day
      const dateRange = eachDayOfInterval({ start: subDays(new Date(), Math.min(days, 30) - 1), end: new Date() })
      const perDay = dateRange.map(d => {
        const key = format(d, 'yyyy-MM-dd')
        const count = filtered.filter(b => b.start_time.startsWith(key)).length
        return { label: format(d, days <= 7 ? 'EEE' : 'M/d'), value: count }
      })

      // Top equipment
      const equipMap = {}
      approved.forEach(b => {
        const name = b.equipment?.name || 'Unknown'
        equipMap[name] = (equipMap[name] || 0) + 1
      })
      const topEquipment = Object.entries(equipMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }))

      // By category
      const catMap = {}
      approved.forEach(b => {
        const cat = b.equipment?.category || 'Uncategorized'
        catMap[cat] = (catMap[cat] || 0) + 1
      })
      const byCategory = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([cat, count]) => ({ label: cat, value: count }))

      // By floor/building
      const floorMap = {}
      approved.forEach(b => {
        const fl = b.equipment?.floor_building || 'Unknown'
        floorMap[fl] = (floorMap[fl] || 0) + 1
      })
      const byFloor = Object.entries(floorMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([fl, count]) => ({ label: fl, value: count }))

      // By booking type
      const typeLabels = { time_slot: 'Time Slot', half_day: 'Half Day', full_day: 'Full Day', multi_day: 'Multi-Day' }
      const typeMap = {}
      filtered.forEach(b => {
        const t = typeLabels[b.booking_type] || b.booking_type
        typeMap[t] = (typeMap[t] || 0) + 1
      })
      const byType = Object.entries(typeMap).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))

      // By status breakdown
      const statusMap = {}
      filtered.forEach(b => { statusMap[b.status] = (statusMap[b.status] || 0) + 1 })

      // Peak hours
      const hourMap = {}
      approved.forEach(b => {
        const h = new Date(b.start_time).getHours()
        hourMap[h] = (hourMap[h] || 0) + 1
      })
      const peakHours = Array.from({ length: 15 }, (_, i) => {
        const h = i + 6
        const period = h < 12 ? 'AM' : 'PM'
        const dh = h > 12 ? h - 12 : h
        return { label: `${dh}${period}`, value: hourMap[h] || 0 }
      })

      // Fleet utilization
      const { count: totalEquip } = await supabase.from('equipment').select('*', { count: 'exact', head: true })
      const utilizationRate = totalEquip > 0 ? Math.round((uniqueEquipment / totalEquip) * 100) : 0

      setStats({ total, approved: approved.length, pending: pending.length, totalHours: Math.round(totalHours), uniqueEquipment, uniqueUsers, utilizationRate, perDay, topEquipment, byCategory, byFloor, byType, peakHours, statusMap })
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1200 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Analytics</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Equipment usage and booking trends</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Range toggle */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-elevated)', padding: 4, borderRadius: 10, border: '1px solid var(--border)' }}>
            {[['7','7d'],['30','30d'],['90','90d'],['365','Year']].map(([val, lbl]) => (
              <button key={val} onClick={() => setRange(val)}
                style={{ padding: '6px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
                  background: range === val ? '#fff' : 'transparent',
                  color: range === val ? 'var(--accent)' : 'var(--text-muted)',
                  boxShadow: range === val ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>
                {lbl}
              </button>
            ))}
          </div>
          {/* Filter button */}
          <button
            onClick={() => setShowFilters(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid ' + (activeFilterCount > 0 ? 'var(--accent)' : 'var(--border)'), background: activeFilterCount > 0 ? 'var(--accent-glow)' : '#fff', color: activeFilterCount > 0 ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            <Filter size={14} />
            Filters
            {activeFilterCount > 0 && (
              <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 11, fontWeight: 700, marginLeft: 2 }}>{activeFilterCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* ── Filter panel ── */}
      {showFilters && (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</div>
              <select className="form-input" style={{ fontSize: 13 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Booking Type</div>
              <select className="form-input" style={{ fontSize: 13 }} value={bookingTypeFilter} onChange={e => setBookingTypeFilter(e.target.value)}>
                <option value="">All Types</option>
                <option value="time_slot">Time Slot</option>
                <option value="half_day">Half Day</option>
                <option value="full_day">Full Day</option>
                <option value="multi_day">Multi-Day</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Category</div>
              <select className="form-input" style={{ fontSize: 13 }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                <option value="">All Categories</option>
                {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Floor / Building</div>
              <select className="form-input" style={{ fontSize: 13 }} value={floorFilter} onChange={e => setFloorFilter(e.target.value)}>
                <option value="">All Floors</option>
                {floorOptions.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div style={{ flex: 2, minWidth: 200 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Equipment</div>
              <select className="form-input" style={{ fontSize: 13 }} value={equipmentFilter} onChange={e => setEquipmentFilter(e.target.value)}>
                <option value="">All Equipment</option>
                {equipmentOptions.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            {activeFilterCount > 0 && (
              <button onClick={clearAllFilters} className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }}>Clear All</button>
            )}
          </div>
          {/* Active filter pills */}
          {activeFilterCount > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
              {statusFilter      && <FilterPill label={statusFilter}           onRemove={() => setStatusFilter('')} />}
              {bookingTypeFilter && <FilterPill label={bookingTypeFilter.replace('_', ' ')} onRemove={() => setBookingTypeFilter('')} />}
              {categoryFilter    && <FilterPill label={categoryFilter}         onRemove={() => setCategoryFilter('')} />}
              {floorFilter       && <FilterPill label={floorFilter}            onRemove={() => setFloorFilter('')} />}
              {equipmentFilter   && <FilterPill label={equipmentOptions.find(e => e.id === equipmentFilter)?.name || equipmentFilter} onRemove={() => setEquipmentFilter('')} />}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
          <div className="spinner" style={{ width: 36, height: 36 }} />
        </div>
      ) : !stats ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>No data available.</div>
      ) : (
        <>
          {/* ── Stat cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            <StatCard icon={Calendar} label="Total Bookings"     value={stats.total}               sub={`${stats.approved} approved · ${stats.pending} pending`} color="var(--accent)" />
            <StatCard icon={Clock}    label="Hours Reserved"     value={stats.totalHours + 'h'}    sub="Approved bookings only"                                   color="#0057b8" />
            <StatCard icon={Package}  label="Equipment Utilized" value={stats.uniqueEquipment}     sub={`${stats.utilizationRate}% of fleet`}                     color="#059669" />
            <StatCard icon={Users}    label="Active Users"       value={stats.uniqueUsers}         sub={`last ${range} days`}                                     color="#7c3aed" />
          </div>

          {/* ── Status breakdown strip ── */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 20px', marginBottom: 16, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[['approved','#059669'],['pending','#d97706'],['rejected','#dc2626'],['cancelled','#8a9ab8']].map(([s, color]) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{stats.statusMap?.[s] || 0}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 6, textTransform: 'capitalize' }}>{s}</span>
                </div>
              </div>
            ))}
            {stats.total > 0 && (
              <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 3 }}>
                {[['approved','#059669'],['pending','#d97706'],['rejected','#dc2626'],['cancelled','#8a9ab8']].map(([s, color]) => {
                  const pct = (stats.statusMap?.[s] || 0) / stats.total * 100
                  return pct > 0 ? <div key={s} style={{ height: 8, width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.5s' }} title={`${s}: ${pct.toFixed(0)}%`} /> : null
                })}
              </div>
            )}
          </div>

          {/* ── Bookings over time + Peak hours ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 20px 12px' }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><TrendingUp size={15} color="var(--accent)" /> Bookings Over Time</div>
              <BarChart data={stats.perDay} labelKey="label" valueKey="value" color="var(--accent)" height={150} />
            </div>
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 20px 12px' }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={15} color="#0057b8" /> Peak Hours</div>
              <BarChart data={stats.peakHours} labelKey="label" valueKey="value" color="#0057b8" height={150} />
            </div>
          </div>

          {/* ── Top equipment + By category ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Award size={15} color="#d97706" /> Most Booked Equipment</div>
              {stats.topEquipment.length === 0
                ? <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>No bookings in this period.</div>
                : stats.topEquipment.map((eq, i) => <HorizBar key={eq.name} label={eq.name} value={eq.count} max={stats.topEquipment[0].count} color={COLORS[i % COLORS.length]} rank={i + 1} />)}
            </div>
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 20px 12px' }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><BarChart2 size={15} color="#059669" /> Bookings by Category</div>
              {stats.byCategory.length === 0
                ? <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>No data.</div>
                : <BarChart data={stats.byCategory} labelKey="label" valueKey="value" color="#059669" height={150} />}
            </div>
          </div>

          {/* ── By floor + booking type breakdown ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Package size={15} color="#0891b2" /> Bookings by Floor / Building</div>
              {stats.byFloor.length === 0
                ? <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>No data.</div>
                : stats.byFloor.map((f, i) => <HorizBar key={f.label} label={f.label} value={f.value} max={stats.byFloor[0].value} color={COLORS[i % COLORS.length]} rank={i + 1} />)}
            </div>
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><BarChart2 size={15} color="var(--accent)" /> Booking Type Breakdown</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['time_slot','Time Slot'],['half_day','Half Day'],['full_day','Full Day'],['multi_day','Multi-Day']].map(([type, label], i) => {
                  const found = stats.byType.find(t => t.label === label)
                  const count = found?.value || 0
                  const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
                  return (
                    <div key={type} style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: COLORS[i] }}>{count}</div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginTop: 2 }}>{label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{pct}% of total</div>
                      <div style={{ height: 4, background: 'var(--border)', borderRadius: 4, marginTop: 10, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: COLORS[i], borderRadius: 4, transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
