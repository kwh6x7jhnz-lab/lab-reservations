import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Search, Filter, Package, MapPin, Tag, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import BookingModal from '../components/booking/BookingModal'

const StatusDot = ({ available }) => (
  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: available ? 'var(--success)' : 'var(--danger)', marginRight: 6 }} />
)

export default function EquipmentList() {
  const [equipment, setEquipment] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [floorFilter, setFloorFilter] = useState('all')
  const [categories, setCategories] = useState([])
  const [floors, setFloors] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEquipment, setSelectedEquipment] = useState(null)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 24

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('equipment').select('*').eq('is_active', true).order('name')
      if (data) {
        setEquipment(data)
        setCategories([...new Set(data.map(e => e.category).filter(Boolean))])
        setFloors([...new Set(data.map(e => e.floor_building).filter(Boolean))])
      }
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    let result = equipment
    if (search) result = result.filter(e => e.name?.toLowerCase().includes(search.toLowerCase()) || e.asset_tag?.toLowerCase().includes(search.toLowerCase()) || e.location?.toLowerCase().includes(search.toLowerCase()))
    if (categoryFilter !== 'all') result = result.filter(e => e.category === categoryFilter)
    if (floorFilter !== 'all') result = result.filter(e => e.floor_building === floorFilter)
    setFiltered(result)
    setPage(0)
  }, [search, categoryFilter, floorFilter, equipment])

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  if (loading) return <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Equipment</h1>
        <p className="page-subtitle">{filtered.length.toLocaleString()} items available for booking</p>
      </div>

      {/* Search & filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input className="form-input" style={{ paddingLeft: 38 }} type="text" placeholder="Search by name, asset tag, or room..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-input" style={{ width: 'auto' }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="form-input" style={{ width: 'auto' }} value={floorFilter} onChange={e => setFloorFilter(e.target.value)}>
          <option value="all">All Floors</option>
          {floors.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {/* Equipment grid */}
      {paged.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <Package size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div style={{ fontSize: 16 }}>No equipment found</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Try adjusting your search or filters</div>
        </div>
      ) : (
        <div className="grid-3" style={{ marginBottom: 24 }}>
          {paged.map(eq => (
            <div key={eq.id} className="card card-hover equipment-card" onClick={() => setSelectedEquipment(eq)}>
              <div className="eq-header">
                <div>
                  <div className="eq-name">{eq.name}</div>
                  <div className="eq-id mono">{eq.asset_tag}</div>
                </div>
                <div>
                  {eq.approval_required ? <span className="badge badge-yellow" style={{ fontSize: 11 }}>Approval Required</span> : null}
                </div>
              </div>
              <div className="eq-meta">
                {eq.category && <span className="badge badge-blue"><Tag size={10} />{eq.category}</span>}
                {eq.floor_building && <span className="badge badge-gray">{eq.floor_building}</span>}
                {eq.training_required && <span className="badge badge-red"><AlertCircle size={10} />Training Required</span>}
              </div>
              {eq.notes && <div className="eq-desc" style={{ WebkitLineClamp: 2, overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical' }}>{eq.notes}</div>}
              <div className="eq-footer">
                <div style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                  <MapPin size={13} style={{ marginRight: 4 }} />{eq.location || 'No location'}
                </div>
                <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); setSelectedEquipment(eq) }}>Book</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>← Prev</button>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Page {page + 1} of {totalPages}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>Next →</button>
        </div>
      )}

      {selectedEquipment && <BookingModal equipment={selectedEquipment} onClose={() => setSelectedEquipment(null)} />}
    </div>
  )
}
