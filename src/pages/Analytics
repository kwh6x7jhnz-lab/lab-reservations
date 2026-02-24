import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { BarChart2, Clock, Package, TrendingUp, Calendar, Users, Award, AlertCircle } from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns'

// ─── Tiny reusable card ───────────────────────────────────────────────────────
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

// ─── Simple bar chart (pure CSS, no lib needed) ───────────────────────────────
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

// ─── Horizontal bar (for rankings) ───────────────────────────────────────────
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

export default function Analytics() {
  const [range, setRange] = useState('30') // days
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    loadAnalytics()
  }, [range])

  async function loadAnalytics() {
    setLoading(true)
    try {
      const days = parseInt(range)
      const since = subDays(new Date(), days).toISOString()

      // Fetch bookings in range with equipment info
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, start_time, end_time, status, booking_type, equipment_id, user_id, equipment:equipment_id(name, category, location, floor_building)')
        .gte('start_time', since)
        .order('start_time', { ascending: true })

      if (!bookings) { setLoading(false); return }

      // ── Overall stats ──────────────────────────────────────────────────────
      const approved = bookings.filter(b => b.status === 'approved')
      const pending  = bookings.filter(b => b.status === 'pending')
      const total    = bookings.length

      // Total hours booked
      const totalHours = approved.reduce((sum, b) => {
        const hrs = (new Date(b.end_time) - new Date(b.start_time)) / 3600000
        return sum + hrs
      }, 0)

      // Unique equipment used
      const uniqueEquipment = new Set(approved.map(b => b.equipment_id)).size

      // Unique users
      const uniqueUsers = new Set(bookings.map(b => b.user_id)).size

      // ── Bookings per day (last N days) ─────────────────────────────────────
      const dateRange = eachDayOfInterval({ start: subDays(new Date(), Math.min(days, 30) - 1), end: new Date() })
      const perDay = dateRange.map(d => {
        const key = format(d, 'yyyy-MM-dd')
        const count = bookings.filter(b => b.start_time.startsWith(key)).length
        return { label: format(d, days <= 7 ? 'EEE' : 'M/d'), value: count }
      })

      // ── Top equipment ──────────────────────────────────────────────────────
      const equipMap = {}
      approved.forEach(b => {
        const name = b.equipment?.name || 'Unknown'
        equipMap[name] = (equipMap[name] || 0) + 1
      })
      const topEquipment = Object.entries(equipMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, count]) => ({ name, count }))

      // ── Bookings by category ───────────────────────────────────────────────
      const catMap = {}
      approved.forEach(b => {
        const cat = b.equipment?.category || 'Uncategorized'
        catMap[cat] = (catMap[cat] || 0) + 1
      })
      const byCategory = Object.entries(catMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([cat, count]) => ({ label: cat, value: count }))

      // ── Bookings by type ───────────────────────────────────────────────────
      const typeLabels = { time_slot: 'Time Slot', half_day: 'Half Day', full_day: 'Full Day', multi_day: 'Multi-Day' }
      const typeMap = {}
      bookings.forEach(b => {
        const t = typeLabels[b.booking_type] || b.booking_type
        typeMap[t] = (typeMap[t] || 0) + 1
      })
      const byType = Object.entries(typeMap)
        .sort((a, b) => b[1] - a[1])
        .map(([label, value]) => ({ label, value }))

      // ── Peak hours ─────────────────────────────────────────────────────────
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

      // ── Utilization rate: % of equipment that had ≥1 booking ──────────────
      const { count: totalEquip } = await supabase.from('equipment').select('*', { count: 'exact', head: true })
      const utilizationRate = totalEquip > 0 ? Math.round((uniqueEquipment / totalEquip) * 100) : 0

      setStats({ total, approved: approved.length, pending: pending.length, totalHours: Math.round(totalHours), uniqueEquipment, uniqueUsers, utilizationRate, perDay, topEquipment, byCategory, byType, peakHours })
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const COLORS = ['var(--accent)', '#0057b8', '#059669', '#d97706', '#7c3aed', '#db2777']

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1200 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Analytics</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Equipment usage and booking trends</p>
        </div>
        <div style={{ display: 'flex', gap: 6, background: 'var(--bg-elevated)', padding: 4, borderRadius: 10, border: '1px solid var(--border)' }}>
          {[['7', '7 days'], ['30', '30 days'], ['90', '90 days'], ['365', 'Year']].map(([val, lbl]) => (
            <button key={val} onClick={() => setRange(val)}
              style={{ padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
                background: range === val ? '#fff' : 'transparent',
                color: range === val ? 'var(--accent)' : 'var(--text-muted)',
                boxShadow: range === val ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
          <div className="spinner" style={{ width: 36, height: 36 }} />
        </div>
      ) : !stats ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>No data available.</div>
      ) : (
        <>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            <StatCard icon={Calendar}   label="Total Bookings"       value={stats.total}            sub={`${stats.approved} approved, ${stats.pending} pending`} color="var(--accent)" />
            <StatCard icon={Clock}      label="Hours Reserved"       value={stats.totalHours + 'h'} sub="Approved bookings only"     color="#0057b8" />
            <StatCard icon={Package}    label="Equipment Utilized"   value={stats.uniqueEquipment}  sub={`${stats.utilizationRate}% of total fleet`}            color="#059669" />
            <StatCard icon={Users}      label="Active Users"         value={stats.uniqueUsers}      sub={`in the last ${range} days`} color="#7c3aed" />
          </div>

          {/* Bookings over time + Peak hours */}
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

          {/* Top equipment + By category */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Award size={15} color="#d97706" /> Most Booked Equipment</div>
              {stats.topEquipment.length === 0
                ? <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>No bookings yet in this period.</div>
                : stats.topEquipment.map((eq, i) => (
                  <HorizBar key={eq.name} label={eq.name} value={eq.count} max={stats.topEquipment[0].count} color={COLORS[i % COLORS.length]} rank={i + 1} />
                ))}
            </div>
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 20px 12px' }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><BarChart2 size={15} color="#059669" /> Bookings by Category</div>
              {stats.byCategory.length === 0
                ? <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>No data.</div>
                : <BarChart data={stats.byCategory} labelKey="label" valueKey="value" color="#059669" height={150} />}
            </div>
          </div>

          {/* Booking type breakdown */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><BarChart2 size={15} color="var(--accent)" /> Booking Type Breakdown</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
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
        </>
      )}
    </div>
  )
}
