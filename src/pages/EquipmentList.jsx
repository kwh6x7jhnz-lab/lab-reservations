import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Search, MapPin, Tag, AlertCircle, Star, Filter } from 'lucide-react'
import BookingModal from '../components/booking/BookingModal'

export default function EquipmentList() {
  const { user } = useAuth()
  const [equipment, setEquipment] = useState([])
  const [filtered, setFiltered] = useState([])
  const [favorites, setFavorites] = useState(new Set())
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [floorFilter, setFloorFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('all')
  const [ownerFilter, setOwnerFilter] = useState('all')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [categories, setCategories] = useState([])
  const [floors, setFloors] = useState([])
  const [locations, setLocations] = useState([])
  const [owners, setOwners] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEquipment, setSelectedEquipment] = useState(null)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 24

  useEffect(() => {
    async function load() {
      const [eqRes, favRes] = await Promise.all([
        supabase.from('equipment').select('*').eq('is_active', true).order('name'),
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

  useEffect(() => {
    let result = equipment
    if (showFavoritesOnly) result = result.filter(e => favorites.has(e.id))
    if (search) result = result.filter(e =>
      e.name?.toLowerCase().includes(search.toLowerCase()) ||
      e.asset_tag?.toLowerCase().includes(search.toLowerCase()) ||
      e.location?.toLowerCase().includes(search.toLowerCase()) ||
      e.owner?.toLowerCase().includes(search.toLowerCase())
    )
    if (categoryFilter !== 'all') result = result.filter(e => e.category === categoryFilter)
    if (floorFilter !== 'all') result = result.filter(e => e.floor_building === floorFilter)
    if (locationFilter !== 'all') result = result.filter(e => e.location === locationFilter)
    if (ownerFilter !== 'all') result = result.filter(e => e.owner === ownerFilter)
    setFiltered(result)
    setPage(0)
  }, [search, categoryFilter, floorFilter, locationFilter, ownerFilter, showFavoritesOnly, equipment, favorites])

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

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const activeFilters = (categoryFilter !== 'all' ? 1 : 0) + (floorFilter !== 'all' ? 1 : 0) + (locationFilter !== 'all' ? 1 : 0) + (ownerFilter !== 'all' ? 1 : 0)

  if (loading) return <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Equipment</h1>
        <p className="page-subtitle">{filtered.length.toLocaleString()} of {equipment.length.toLocaleString()} items</p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input className="form-input" style={{ paddingLeft: 38 }} type="text" placeholder="Search by name, asset tag, room, or owner..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className={'btn btn-sm ' + (showFavoritesOnly ? 'btn-primary' : 'btn-secondary')} onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}>
          <Star size={14} fill={showFavoritesOnly ? '#fff' : 'none'} /> Favorites {favorites.size > 0 ? `(${favorites.size})` : ''}
        </button>
        <button className={'btn btn-sm ' + (showFilters ? 'btn-primary' : 'btn-secondary')} onClick={() => setShowFilters(!showFilters)}>
          <Filter size={14} /> Filters {activeFilters > 0 ? `(${activeFilters})` : ''}
        </button>
      </div>

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
          <button className="btn btn-secondary btn-sm" onClick={() => { setCategoryFilter('all'); setFloorFilter('all'); setLocationFilter('all'); setOwnerFilter('all') }}>Clear</button>
        </div>
      )}

      {paged.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <Search size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div style={{ fontSize: 16 }}>No equipment found</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Try adjusting your search or filters</div>
        </div>
      ) : (
        <div className="grid-3" style={{ marginBottom: 24 }}>
          {paged.map(eq => (
            <div key={eq.id} className="card card-hover equipment-card" onClick={() => setSelectedEquipment(eq)}>
              <div className="eq-header">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="eq-name">{eq.name}</div>
                  <div className="eq-id">{eq.asset_tag}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexShrink: 0 }}>
                  <button onClick={e => toggleFavorite(e, eq.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: favorites.has(eq.id) ? '#f59e0b' : 'var(--text-dim)', transition: 'all 0.15s' }} title={favorites.has(eq.id) ? 'Remove from favorites' : 'Add to favorites'}>
                    <Star size={16} fill={favorites.has(eq.id) ? '#f59e0b' : 'none'} />
                  </button>
                  {eq.approval_required && <span className="badge badge-yellow" style={{ fontSize: 10 }}>Approval</span>}
                </div>
              </div>
              <div className="eq-meta">
                {eq.category && <span className="badge badge-blue"><Tag size={10} />{eq.category}</span>}
                {eq.floor_building && <span className="badge badge-gray">{eq.floor_building}</span>}
                {eq.training_required && <span className="badge badge-red"><AlertCircle size={10} />Training</span>}
              </div>
              {eq.owner && <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Owner: {eq.owner}</div>}
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
