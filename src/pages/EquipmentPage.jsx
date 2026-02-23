import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Search, MapPin, Layers, AlertTriangle, BookMarked, X, Filter, ChevronDown } from 'lucide-react'
import BookingModal from '../components/bookings/BookingModal'

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [floor, setFloor] = useState('')
  const [category, setCategory] = useState('')
  const [approvalFilter, setApprovalFilter] = useState('')
  const [floors, setFloors] = useState([])
  const [categories, setCategories] = useState([])
  const [selected, setSelected] = useState(null)
  const [showBooking, setShowBooking] = useState(false)

  useEffect(() => {
    fetchEquipment()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [equipment, search, floor, category, approvalFilter])

  async function fetchEquipment() {
    const { data } = await supabase
      .from('equipment')
      .select('*')
      .eq('active', true)
      .order('name')
    if (data) {
      setEquipment(data)
      setFloors([...new Set(data.map(e => e.floor).filter(Boolean))].sort())
      setCategories([...new Set(data.map(e => e.category).filter(Boolean))].sort())
    }
    setLoading(false)
  }

  function applyFilters() {
    let result = [...equipment]
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(e =>
        e.name?.toLowerCase().includes(s) ||
        e.asset_tag?.toLowerCase().includes(s) ||
        e.category?.toLowerCase().includes(s) ||
        e.location?.toLowerCase().includes(s) ||
        e.notes?.toLowerCase().includes(s)
      )
    }
    if (floor) result = result.filter(e => e.floor === floor)
    if (category) result = result.filter(e => e.category === category)
    if (approvalFilter === 'open') result = result.filter(e => !e.requires_approval)
    if (approvalFilter === 'approval') result = result.filter(e => e.requires_approval)
    setFiltered(result)
  }

  const clearFilters = () => { setSearch(''); setFloor(''); setCategory(''); setApprovalFilter('') }
  const hasFilters = search || floor || category || approvalFilter

  const handleBook = (eq) => { setSelected(eq); setShowBooking(true) }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Browse Equipment</h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginTop: 4 }}>
            {loading ? '...' : `${filtered.length} of ${equipment.length} items`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-input-wrap" style={{ maxWidth: 340 }}>
          <Search size={15} />
          <input
            className="form-input search-input"
            placeholder="Search by name, ID, category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select className="form-select" style={{ width: 'auto' }} value={floor} onChange={e => setFloor(e.target.value)}>
          <option value="">All Floors</option>
          {floors.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        <select className="form-select" style={{ width: 'auto' }} value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select className="form-select" style={{ width: 'auto' }} value={approvalFilter} onChange={e => setApprovalFilter(e.target.value)}>
          <option value="">Any Access</option>
          <option value="open">Book Immediately</option>
          <option value="approval">Requires Approval</option>
        </select>

        {hasFilters && (
          <button onClick={clearFilters} className="btn btn-ghost btn-sm" style={{ gap: 4 }}>
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Search size={40} />
          <h3>No equipment found</h3>
          <p>Try adjusting your search or filters</p>
          {hasFilters && <button onClick={clearFilters} className="btn btn-secondary btn-sm">Clear filters</button>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map(eq => (
            <EquipmentCard key={eq.id} equipment={eq} onBook={() => handleBook(eq)} />
          ))}
        </div>
      )}

      {showBooking && selected && (
        <BookingModal
          equipment={selected}
          onClose={() => { setShowBooking(false); setSelected(null) }}
        />
      )}
    </div>
  )
}

function EquipmentCard({ equipment: eq, onBook }) {
  return (
    <div className="equipment-card" onClick={onBook}>
      <div className="equipment-card-header">
        <div>
          <div className="equipment-name">{eq.name}</div>
          <div className="equipment-id">{eq.asset_tag}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', flexShrink: 0 }}>
          {eq.requires_approval && (
            <span className="badge badge-yellow">
              <AlertTriangle size={10} /> Approval
            </span>
          )}
          {eq.training_required && (
            <span className="badge badge-blue">Training</span>
          )}
        </div>
      </div>

      <div className="equipment-meta">
        {eq.location && (
          <div className="equipment-meta-row">
            <MapPin size={13} />
            <span>{eq.location}{eq.floor ? ` · ${eq.floor}` : ''}</span>
          </div>
        )}
        {eq.category && (
          <div className="equipment-meta-row">
            <Layers size={13} />
            <span>{eq.category}</span>
          </div>
        )}
        {eq.owner_name && (
          <div className="equipment-meta-row" style={{ color: 'var(--text-3)' }}>
            <span>Owner: {eq.owner_name}</span>
          </div>
        )}
      </div>

      {eq.notes && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', borderTop: '1px solid var(--border)', paddingTop: 10, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {eq.notes}
        </p>
      )}

      <div className="equipment-card-footer">
        <span style={{ fontSize: '0.78rem', color: eq.requires_approval ? 'var(--yellow)' : 'var(--accent)' }}>
          {eq.requires_approval ? 'Requires approval' : 'Available to book'}
        </span>
        <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); onBook() }}>
          <BookMarked size={13} /> Book
        </button>
      </div>
    </div>
  )
}
