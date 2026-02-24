import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Search, MapPin, Tag, AlertCircle, Star, Filter, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import BookingModal from '../components/booking/BookingModal'

const PAGE_SIZE = 50

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ChevronsUpDown size={13} style={{ opacity: 0.3, flexShrink: 0 }} />
  return sortDir === 'asc'
    ? <ChevronUp size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
    : <ChevronDown size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
}

export default function EquipmentList() {
  const { user } = useAuth()
  const [equipment, setEquipment]               = useState([])
  const [filtered, setFiltered]                 = useState([])
  const [favorites, setFavorites]               = useState(new Set())
  const [search, setSearch]                     = useState('')
  const [categoryFilter, setCategoryFilter]     = useState('all')
  const [floorFilter, setFloorFilter]           = useState('all')
  const [locationFilter, setLocationFilter]     = useState('all')
  const [ownerFilter, setOwnerFilter]           = useState('all')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [showFilters, setShowFilters]           = useState(false)
  const [categories, setCategories]             = useState([])
  const [floors, setFloors]                     = useState([])
  const [locations, setLocations]               = useState([])
  const [owners, setOwners]                     = useState([])
  const [loading, setLoading]                   = useState(true)
  const [selectedEquipment, setSelectedEquipment] = useState(null)
  const [page, setPage]                         = useState(0)
  const [sortField, setSortField]               = useState('name')
  const [sortDir, setSortDir]                   = useState('asc')

  useEffect(() => {
    async function load() {
      const [eqRes, favRes] = await Promise.all([
        // Only load bookable equipment
        supabase.from('equipment').select('*').eq('is_active', true).eq('is_bookable', true).order('name'),
        supabase.from('favorites').select('equipment_id').eq('user_id', user.id)
      ])
      if (eqRes.data) {
        setEquipment(eqRes.data)
        setCategories([...new Set(eqRes.data.map(e => e.category).filter(Boolean))].sort())
        setFloors([...new Set(eqRes.data.map(e => e.floor_building).filter(Boolean))].sort())
        setLocations([...new Set(eqRes.data.map(e => e.location).filter(Boolean))].sort())
        setOwners([...new Set(eqRes.data.map(e => e.owner).filter(Boolean))].sort())
      }
      if (favRes.data) setFavorites(new Set(favRes.data.map(f => f.equipment_id)))
      setLoading(false)
    }
    load()
  }, [user])

  // Filter + sort
  useEffect(() => {
    let result = [...equipment]
    if (showFavoritesOnly)     result = result.filter(e => favorites.has(e.id))
    if (search)                result = result.filter(e =>
      e.name?.toLowerCase().includes(search.toLowerCase()) ||
      e.asset_tag?.toLowerCase().includes(search.toLowerCase()) ||
      e.location?.toLowerCase().includes(search.toLowerCase()) ||
      e.owner?.toLowerCase().includes(search.toLowerCase())
    )
    if (categoryFilter !== 'all') result = result.filter(e => e.category === categoryFilter)
    if (floorFilter !== 'all')    result = result.filter(e => e.floor_building === floorFilter)
    if (locationFilter !== 'all') result = result.filter(e => e.location === locationFilter)
    if (ownerFilter !== 'all')    result = result.filter(e => e.owner === ownerFilter)

    // Sort
    result.sort((a, b) => {
      const av = (a[sortField] || '').toString().toLowerCase()
      const bv = (b[sortField] || '').toString().toLowerCase()
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })

    setFiltered(result)
    setPage(0)
  }, [search, categoryFilter, floorFilter, locationFilter, ownerFilter, showFavoritesOnly, equipment, favorites, sortField, sortDir])

  function handleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  async function toggleFavorite(e, equipmentId) {
    e.stopPropagation()
    const isFav = favorites.has(equipmentId)
    const newFavs = new Set(favorites)
    if (isFav) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('equipment_id', equipmentId)
      newFavs.delete(equipmentId)
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, equipment_id: equipmentId })
      newFavs.add(equipmentId)
    }
    setFavorites(newFavs)
  }

  const paged       = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE)
  const activeFilters = (categoryFilter !== 'all' ? 1 : 0) + (floorFilter !== 'all' ? 1 : 0) + (locationFilter !== 'all' ? 1 : 0) + (ownerFilter !== 'all' ? 1 : 0)

  const ColHeader = ({ field, label, style = {} }) => (
    <th onClick={() => handleSort(field)}
      style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', borderBottom: '2px solid var(--border)', background: '#fafafa', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {label}
        <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
      </div>
    </th>
  )

  if (loading) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" />
    </div>
  )

  return (
    <div className="page">
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Equipment</h1>
          <p className="page-subtitle">{filtered.length.toLocaleString()} of {equipment.length.toLocaleString()} bookable instruments</p>
        </div>
      </div>

      {/* ── Search + controls ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input className="form-input" style={{ paddingLeft: 38 }} type="text"
            placeholder="Search by name, asset tag, room, or owner..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className={'btn btn-sm ' + (showFavoritesOnly ? 'btn-primary' : 'btn-secondary')}
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}>
          <Star size={14} fill={showFavoritesOnly ? '#fff' : 'none'} />
          Favorites{favorites.size > 0 ? ` (${favorites.size})` : ''}
        </button>
        <button className={'btn btn-sm ' + (showFilters ? 'btn-primary' : 'btn-secondary')}
          onClick={() => setShowFilters(!showFilters)}>
          <Filter size={14} /> Filters{activeFilters > 0 ? ` (${activeFilters})` : ''}
        </button>
      </div>

      {/* ── Filter panel ── */}
      {showFilters && (
        <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, minWidth: 140 }}>
            <label className="form-label">Category</label>
            <select className="form-input" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: 140 }}>
            <label className="form-label">Floor / Building</label>
            <select className="form-input" value={floorFilter} onChange={e => setFloorFilter(e.target.value)}>
              <option value="all">All Floors</option>
              {floors.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: 140 }}>
            <label className="form-label">Room</label>
            <select className="form-input" value={locationFilter} onChange={e => setLocationFilter(e.target.value)}>
              <option value="all">All Rooms</option>
              {locations.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: 140 }}>
            <label className="form-label">Owner</label>
            <select className="form-input" value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}>
              <option value="all">All Owners</option>
              {owners.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <button className="btn btn-secondary btn-sm"
            onClick={() => { setCategoryFilter('all'); setFloorFilter('all'); setLocationFilter('all'); setOwnerFilter('all') }}>
            Clear
          </button>
        </div>
      )}

      {/* ── Table ── */}
      {paged.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <Search size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div style={{ fontSize: 16 }}>No equipment found</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Try adjusting your search or filters</div>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {/* Favorite star col — not sortable */}
                <th style={{ width: 36, padding: '10px 0 10px 14px', borderBottom: '2px solid var(--border)', background: '#fafafa' }} />
                <ColHeader field="name"           label="Name"              style={{ minWidth: 200 }} />
                <ColHeader field="asset_tag"      label="Asset Tag"         style={{ minWidth: 120 }} />
                <ColHeader field="location"       label="Room"              style={{ minWidth: 120 }} />
                <ColHeader field="floor_building" label="Floor / Building"  style={{ minWidth: 130 }} />
                <ColHeader field="category"       label="Category"          style={{ minWidth: 130 }} />
                {/* Flags col — not sortable */}
                <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', borderBottom: '2px solid var(--border)', background: '#fafafa', minWidth: 120 }}>Flags</th>
                {/* Book col */}
                <th style={{ width: 80, padding: '10px 14px', borderBottom: '2px solid var(--border)', background: '#fafafa' }} />
              </tr>
            </thead>
            <tbody>
              {paged.map((eq, idx) => {
                const isFav = favorites.has(eq.id)
                const isEven = idx % 2 === 0
                return (
                  <tr key={eq.id}
                    style={{ background: isEven ? '#fff' : '#fafafa', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-glow)'}
                    onMouseLeave={e => e.currentTarget.style.background = isEven ? '#fff' : '#fafafa'}>

                    {/* Star */}
                    <td style={{ padding: '10px 0 10px 14px', verticalAlign: 'middle' }}>
                      <button onClick={e => toggleFavorite(e, eq.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: isFav ? '#f59e0b' : 'var(--text-dim)', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
                        title={isFav ? 'Remove from favorites' : 'Add to favorites'}>
                        <Star size={15} fill={isFav ? '#f59e0b' : 'none'} />
                      </button>
                    </td>

                    {/* Name */}
                    <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{eq.name}</div>
                      {eq.owner && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>Owner: {eq.owner}</div>}
                    </td>

                    {/* Asset tag */}
                    <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                      <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '2px 7px', borderRadius: 5, border: '1px solid var(--border)' }}>
                        {eq.asset_tag || '—'}
                      </span>
                    </td>

                    {/* Room */}
                    <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-muted)' }}>
                        <MapPin size={12} style={{ flexShrink: 0 }} />
                        {eq.location || '—'}
                      </div>
                    </td>

                    {/* Floor / Building */}
                    <td style={{ padding: '10px 14px', verticalAlign: 'middle', fontSize: 13, color: 'var(--text-muted)' }}>
                      {eq.floor_building || '—'}
                    </td>

                    {/* Category */}
                    <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                      {eq.category
                        ? <span className="badge badge-blue" style={{ fontSize: 11 }}><Tag size={10} />{eq.category}</span>
                        : <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>—</span>}
                    </td>

                    {/* Flags */}
                    <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {eq.approval_required && (
                          <span className="badge badge-yellow" style={{ fontSize: 10 }}>Approval</span>
                        )}
                        {eq.training_required && (
                          <span className="badge badge-red" style={{ fontSize: 10 }}>
                            <AlertCircle size={9} /> Training
                          </span>
                        )}
                        {!eq.approval_required && !eq.training_required && (
                          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>—</span>
                        )}
                      </div>
                    </td>

                    {/* Book button — opens modal directly */}
                    <td style={{ padding: '10px 14px', verticalAlign: 'middle', textAlign: 'right' }}>
                      <button className="btn btn-primary btn-sm"
                        onClick={e => { e.stopPropagation(); setSelectedEquipment(eq) }}>
                        Book
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(0)} disabled={page === 0}>«</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>← Prev</button>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', minWidth: 100, textAlign: 'center' }}>
            Page {page + 1} of {totalPages}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>Next →</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>»</button>
        </div>
      )}

      {/* ── Booking modal ── */}
      {selectedEquipment && (
        <BookingModal equipment={selectedEquipment} onClose={() => setSelectedEquipment(null)} />
      )}
    </div>
  )
}
