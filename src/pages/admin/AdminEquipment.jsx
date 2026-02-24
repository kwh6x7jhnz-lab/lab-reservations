import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { Search, Edit2, Trash2, Plus, X, Save, Upload, RefreshCw, AlertTriangle, BookOpen } from 'lucide-react'

const EMPTY_EQ = {
  name: '', asset_tag: '', location: '', floor_building: '', category: '',
  training_required: false, approval_required: false, owner: '', notes: '',
  is_active: true, is_bookable: true, is_new_asset: false,
}

// ── CSV sync modal ─────────────────────────────────────────────────────────────
function SyncModal({ onClose, onComplete, toast }) {
  const fileRef = useRef()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState(null)

  function handleFile(e) {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    const reader = new FileReader()
    reader.onload = ev => {
      const lines = ev.target.result.split('\n').filter(Boolean)
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g,''))
      const rows = lines.slice(1, 4).map(l => {
        const vals = l.split(',').map(v => v.trim().replace(/"/g,''))
        return Object.fromEntries(headers.map((h, i) => [h, vals[i] || '']))
      })
      setPreview({ headers, rows, total: lines.length - 1 })
    }
    reader.readAsText(f)
  }

  async function runSync() {
    if (!file) return
    setSyncing(true)
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(Boolean)
      const rawHeaders = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g,''))

      // Column mapping (same as existing CSV_COLUMNS logic)
      const colMap = {
        asset_tag:        ['asset_tag','asset tag','id','equipment_id','asset id'],
        name:             ['name','equipment_name','equipment name','title'],
        location:         ['location','room','room_number','room number'],
        floor_building:   ['floor_building','floor building','floor','building'],
        category:         ['category','type','equipment_type'],
        training_required:['training_required','training required','training','requires_training'],
        approval_required:['approval_required','approval required','approval','requires_approval'],
        owner:            ['owner','responsible_person','responsible person','owner_name'],
        notes:            ['notes','description','details','comments'],
      }
      const colIndex = {}
      Object.entries(colMap).forEach(([field, aliases]) => {
        const idx = rawHeaders.findIndex(h => aliases.includes(h))
        if (idx >= 0) colIndex[field] = idx
      })

      if (!('name' in colIndex) && !('asset_tag' in colIndex)) {
        toast('CSV must have a "name" or "asset_tag" column', 'error')
        setSyncing(false); return
      }

      const rows = lines.slice(1).map(l => {
        const vals = l.split(',').map(v => v.trim().replace(/"/g,''))
        const row = {}
        Object.entries(colIndex).forEach(([field, idx]) => {
          let val = vals[idx] || ''
          if (['training_required','approval_required'].includes(field)) {
            val = ['true','yes','1','x'].includes(val.toLowerCase())
          }
          row[field] = val
        })
        // New assets added via sync default to is_new_asset = true, is_bookable = false
        row.is_active    = true
        row.is_new_asset = true
        row.is_bookable  = false
        return row
      }).filter(r => r.name || r.asset_tag)

      // Upsert on asset_tag where present, otherwise insert
      const withTag    = rows.filter(r => r.asset_tag)
      const withoutTag = rows.filter(r => !r.asset_tag)

      let upserted = 0, inserted = 0, errors = 0

      if (withTag.length) {
        const { error } = await supabase.from('equipment').upsert(withTag, { onConflict: 'asset_tag', ignoreDuplicates: false })
        if (error) { errors++; console.error(error) }
        else upserted += withTag.length
      }
      if (withoutTag.length) {
        const { error } = await supabase.from('equipment').insert(withoutTag)
        if (error) { errors++; console.error(error) }
        else inserted += withoutTag.length
      }

      setResult({ upserted, inserted, errors, total: rows.length })
      onComplete()
    } catch (err) {
      toast('Sync failed: ' + err.message, 'error')
    }
    setSyncing(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>Sync Instrument Data</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Upload a CSV to add or update equipment records.</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={18} /></button>
        </div>

        {result ? (
          <div>
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: '#15803d', marginBottom: 8 }}>✓ Sync complete</div>
              <div style={{ fontSize: 13, color: '#166534', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div>{result.upserted} records updated / upserted by asset tag</div>
                <div>{result.inserted} new records inserted</div>
                {result.errors > 0 && <div style={{ color: 'var(--danger)' }}>⚠ {result.errors} batch(es) had errors — check console</div>}
              </div>
            </div>
            <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#854d0e', marginBottom: 20 }}>
              New records were flagged as <strong>New Asset</strong> and set to <strong>Not Bookable</strong> by default. Review them in the table and enable booking when ready.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: '28px 20px', textAlign: 'center', marginBottom: 16, cursor: 'pointer', background: file ? 'var(--bg-elevated)' : '#fff' }}
              onClick={() => fileRef.current?.click()}>
              <Upload size={24} style={{ color: 'var(--text-dim)', marginBottom: 8 }} />
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
                {file ? file.name : 'Click to choose a CSV file'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Columns: name, asset_tag, location, floor_building, category, owner, training_required, approval_required
              </div>
              <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFile} />
            </div>

            {preview && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                  PREVIEW — {preview.total} rows detected
                </div>
                <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>{preview.headers.map(h => <th key={h} style={{ padding: '6px 10px', background: '#fafafa', borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((r, i) => (
                        <tr key={i}>{preview.headers.map(h => <td key={h} style={{ padding: '5px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text)' }}>{r[h] || '—'}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>Showing first 3 rows</div>
              </div>
            )}

            <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#854d0e', marginBottom: 20 }}>
              Records with matching <strong>asset_tag</strong> will be updated. New records will be added as <strong>New Asset / Not Bookable</strong> until reviewed.
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={runSync} disabled={!file || syncing}>
                {syncing ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : <><RefreshCw size={14} /> Run Sync</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function AdminEquipment() {
  const toast = useToast()
  const [equipment, setEquipment]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all | active | inactive | new | unbookable
  const [editing, setEditing]       = useState(null)
  const [form, setForm]             = useState(EMPTY_EQ)
  const [showModal, setShowModal]   = useState(false)
  const [showSync, setShowSync]     = useState(false)
  const [saving, setSaving]         = useState(false)
  const [page, setPage]             = useState(0)
  const PAGE_SIZE = 25

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('equipment').select('*').order('name')
    setEquipment(data || [])
    setLoading(false)
  }

  function openNew() { setEditing(null); setForm(EMPTY_EQ); setShowModal(true) }
  function openEdit(eq) { setEditing(eq.id); setForm({ ...eq }); setShowModal(true) }

  async function save() {
    setSaving(true)
    let error
    if (editing) {
      const res = await supabase.from('equipment').update(form).eq('id', editing)
      error = res.error
      if (!error) setEquipment(prev => prev.map(e => e.id === editing ? { ...e, ...form } : e))
    } else {
      const res = await supabase.from('equipment').insert(form).select().single()
      error = res.error
      if (!error) setEquipment(prev => [res.data, ...prev])
    }
    if (error) toast(error.message, 'error')
    else { toast(editing ? 'Equipment updated' : 'Equipment added', 'success'); setShowModal(false) }
    setSaving(false)
  }

  async function toggleActive(eq) {
    const { error } = await supabase.from('equipment').update({ is_active: !eq.is_active }).eq('id', eq.id)
    if (error) { toast(error.message, 'error'); return }
    setEquipment(prev => prev.map(e => e.id === eq.id ? { ...e, is_active: !e.is_active } : e))
    toast(eq.is_active ? 'Equipment deactivated' : 'Equipment activated', 'success')
  }

  async function toggleBookable(eq) {
    const { error } = await supabase.from('equipment').update({ is_bookable: !eq.is_bookable }).eq('id', eq.id)
    if (error) { toast(error.message, 'error'); return }
    setEquipment(prev => prev.map(e => e.id === eq.id ? { ...e, is_bookable: !e.is_bookable } : e))
    toast(eq.is_bookable ? 'Removed from booking' : 'Now bookable', 'success')
  }

  async function clearNewAsset(eq) {
    const { error } = await supabase.from('equipment').update({ is_new_asset: false }).eq('id', eq.id)
    if (error) { toast(error.message, 'error'); return }
    setEquipment(prev => prev.map(e => e.id === eq.id ? { ...e, is_new_asset: false } : e))
    toast('Marked as reviewed', 'success')
  }

  const newAssetCount    = equipment.filter(e => e.is_new_asset).length
  const unbookableCount  = equipment.filter(e => e.is_active && !e.is_bookable && !e.is_new_asset).length

  const filtered = equipment.filter(e => {
    if (search && !e.name?.toLowerCase().includes(search.toLowerCase()) && !e.asset_tag?.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter === 'active')     return e.is_active && !e.is_new_asset
    if (statusFilter === 'inactive')   return !e.is_active
    if (statusFilter === 'new')        return e.is_new_asset
    if (statusFilter === 'unbookable') return e.is_active && !e.is_bookable && !e.is_new_asset
    return true
  })
  const paged      = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  if (loading) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" />
    </div>
  )

  return (
    <div className="page">

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Manage Equipment</h1>
          <p className="page-subtitle">{equipment.length.toLocaleString()} total · {equipment.filter(e=>e.is_bookable).length} bookable</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setShowSync(true)}>
            <RefreshCw size={15} /> Sync Instrument Data
          </button>
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={16} /> Add Equipment
          </button>
        </div>
      </div>

      {/* ── Alert banners ── */}
      {newAssetCount > 0 && (
        <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#854d0e' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span><strong>{newAssetCount} new asset{newAssetCount !== 1 ? 's' : ''}</strong> need review — not yet bookable.</span>
          <button className="btn btn-sm" style={{ marginLeft: 'auto', background: '#fde047', border: 'none', color: '#854d0e', fontWeight: 600 }}
            onClick={() => { setStatusFilter('new'); setPage(0) }}>
            Review Now
          </button>
        </div>
      )}

      {/* ── Search + filter strip ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Search by name or asset tag..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} />
        </div>
        {/* Status filter pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            ['all',        'All',         null],
            ['active',     'Active',      null],
            ['inactive',   'Inactive',    null],
            ['new',        `New Assets${newAssetCount > 0 ? ` (${newAssetCount})` : ''}`,  newAssetCount > 0 ? '#854d0e' : null],
            ['unbookable', `Not Bookable${unbookableCount > 0 ? ` (${unbookableCount})` : ''}`, null],
          ].map(([val, label, color]) => (
            <button key={val} onClick={() => { setStatusFilter(val); setPage(0) }}
              style={{ padding: '5px 12px', borderRadius: 20, border: '1px solid ' + (statusFilter === val ? 'var(--accent)' : 'var(--border)'), background: statusFilter === val ? 'var(--accent-glow)' : '#fff', color: statusFilter === val ? 'var(--accent)' : color || 'var(--text-muted)', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafafa', borderBottom: '2px solid var(--border)' }}>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Name</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Asset Tag</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Location</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Category</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Flags</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Bookable</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Status</th>
              <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 48, fontSize: 14 }}>No equipment found</td></tr>
            ) : paged.map((eq, idx) => (
              <tr key={eq.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa', opacity: eq.is_active ? 1 : 0.55, borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-glow)'}
                onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'}>

                {/* Name */}
                <td style={{ padding: '10px 16px', verticalAlign: 'middle' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{eq.name}</div>
                  {eq.is_new_asset && (
                    <span style={{ fontSize: 10, background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047', borderRadius: 4, padding: '1px 6px', marginTop: 3, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <AlertTriangle size={9} /> New Asset
                    </span>
                  )}
                </td>

                {/* Asset tag */}
                <td style={{ padding: '10px 16px', verticalAlign: 'middle' }}>
                  <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '2px 7px', borderRadius: 5, border: '1px solid var(--border)' }}>
                    {eq.asset_tag || '—'}
                  </span>
                </td>

                {/* Location */}
                <td style={{ padding: '10px 16px', verticalAlign: 'middle', fontSize: 13, color: 'var(--text-muted)' }}>
                  {eq.location || '—'}
                  {eq.floor_building && <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{eq.floor_building}</div>}
                </td>

                {/* Category */}
                <td style={{ padding: '10px 16px', verticalAlign: 'middle', fontSize: 13 }}>
                  {eq.category || <span style={{ color: 'var(--text-dim)' }}>—</span>}
                </td>

                {/* Flags */}
                <td style={{ padding: '10px 16px', verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {eq.training_required && <span className="badge badge-red"    style={{ fontSize: 10 }}>Training</span>}
                    {eq.approval_required && <span className="badge badge-yellow" style={{ fontSize: 10 }}>Approval</span>}
                    {!eq.training_required && !eq.approval_required && <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>—</span>}
                  </div>
                </td>

                {/* Bookable toggle */}
                <td style={{ padding: '10px 16px', verticalAlign: 'middle' }}>
                  <button onClick={() => toggleBookable(eq)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, border: '1px solid ' + (eq.is_bookable ? '#86efac' : 'var(--border)'), background: eq.is_bookable ? '#f0fdf4' : 'var(--bg-elevated)', color: eq.is_bookable ? '#15803d' : 'var(--text-muted)', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                    <BookOpen size={11} />
                    {eq.is_bookable ? 'Bookable' : 'Not Bookable'}
                  </button>
                </td>

                {/* Active status */}
                <td style={{ padding: '10px 16px', verticalAlign: 'middle' }}>
                  <span className={'badge ' + (eq.is_active ? 'badge-green' : 'badge-gray')} style={{ fontSize: 11 }}>
                    {eq.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>

                {/* Actions */}
                <td style={{ padding: '10px 16px', verticalAlign: 'middle', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    {eq.is_new_asset && (
                      <button className="btn btn-ghost btn-sm" onClick={() => clearNewAsset(eq)}
                        style={{ padding: '4px 8px', fontSize: 11, color: '#854d0e' }} title="Mark as reviewed">
                        ✓ Review
                      </button>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(eq)} style={{ padding: '4px 8px' }} title="Edit">
                      <Edit2 size={13} />
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(eq)}
                      style={{ padding: '4px 8px', color: eq.is_active ? 'var(--danger)' : 'var(--success)' }}
                      title={eq.is_active ? 'Deactivate' : 'Activate'}>
                      {eq.is_active ? <Trash2 size={13} /> : <Plus size={13} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 4, marginBottom: 16, alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>← Prev</button>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Page {page + 1} of {totalPages}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>Next →</button>
        </div>
      )}

      {/* ── Edit / Add modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600 }}>{editing ? 'Edit Equipment' : 'Add Equipment'}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                ['name',           'Name *'],
                ['asset_tag',      'Asset Tag'],
                ['location',       'Room / Location'],
                ['floor_building', 'Floor / Building'],
                ['category',       'Category'],
                ['owner',          'Owner / Responsible Person'],
              ].map(([key, label]) => (
                <div key={key} className="form-group">
                  <label className="form-label">{label}</label>
                  <input className="form-input" value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="form-label">Notes / Description</label>
              <textarea className="form-input" rows={3} value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginTop: 16 }}>
              {[
                ['training_required', 'Requires Training'],
                ['approval_required', 'Requires Approval'],
                ['is_active',         'Active'],
                ['is_bookable',       'Bookable'],
                ['is_new_asset',      'Flag as New Asset'],
              ].map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                  <input type="checkbox" checked={!!form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                    style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
                  {label}
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={!form.name || saving}>
                {saving
                  ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  : <><Save size={15} /> Save</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sync modal ── */}
      {showSync && (
        <SyncModal
          onClose={() => setShowSync(false)}
          onComplete={load}
          toast={toast}
        />
      )}
    </div>
  )
}
