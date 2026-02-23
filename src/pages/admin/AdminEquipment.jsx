import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { Search, Edit2, Trash2, Plus, X, Save } from 'lucide-react'

const EMPTY_EQ = { name: '', asset_tag: '', location: '', floor_building: '', category: '', training_required: false, approval_required: false, owner: '', notes: '', is_active: true }

export default function AdminEquipment() {
  const toast = useToast()
  const [equipment, setEquipment] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_EQ)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  useEffect(() => { load() }, [])

  async function load() {
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

  const filtered = equipment.filter(e => !search || e.name?.toLowerCase().includes(search.toLowerCase()) || e.asset_tag?.toLowerCase().includes(search.toLowerCase()))
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  if (loading) return <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><div className="spinner" /></div>

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 className="page-title">Manage Equipment</h1>
          <p className="page-subtitle">{equipment.length.toLocaleString()} total items</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> Add Equipment</button>
      </div>

      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 400 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
        <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Search equipment..." value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} />
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Asset Tag</th><th>Location</th><th>Category</th><th>Flags</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {paged.map(eq => (
                <tr key={eq.id} style={{ opacity: eq.is_active ? 1 : 0.5 }}>
                  <td style={{ fontWeight: 500 }}>{eq.name}</td>
                  <td style={{ fontFamily: 'Space Mono', fontSize: 12, color: 'var(--text-muted)' }}>{eq.asset_tag}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{eq.location}</td>
                  <td style={{ fontSize: 13 }}>{eq.category || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {eq.training_required && <span className="badge badge-red" style={{ fontSize: 10 }}>Training</span>}
                      {eq.approval_required && <span className="badge badge-yellow" style={{ fontSize: 10 }}>Approval</span>}
                    </div>
                  </td>
                  <td>
                    <span className={'badge ' + (eq.is_active ? 'badge-green' : 'badge-gray')} style={{ fontSize: 11 }}>
                      {eq.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(eq)} style={{ padding: '4px 8px' }}><Edit2 size={13} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(eq)} style={{ padding: '4px 8px', color: eq.is_active ? 'var(--danger)' : 'var(--success)' }}>
                        {eq.is_active ? <Trash2 size={13} /> : <Plus size={13} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No equipment found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {Math.ceil(filtered.length / PAGE_SIZE) > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16, alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>← Prev</button>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Page {page + 1} of {Math.ceil(filtered.length / PAGE_SIZE)}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(filtered.length / PAGE_SIZE) - 1}>Next →</button>
        </div>
      )}

      {/* Edit/Add Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600 }}>{editing ? 'Edit Equipment' : 'Add Equipment'}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[['name','Name *'],['asset_tag','Asset Tag'],['location','Room / Location'],['floor_building','Floor / Building'],['category','Category'],['owner','Owner / Responsible Person']].map(([key, label]) => (
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
            <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
              {[['training_required','Requires Training'],['approval_required','Requires Approval'],['is_active','Active']].map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                  <input type="checkbox" checked={!!form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
                  {label}
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={!form.name || saving}>
                {saving ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <><Save size={15} /> Save</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
