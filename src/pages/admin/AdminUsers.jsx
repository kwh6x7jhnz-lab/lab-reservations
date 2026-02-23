import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { useAuth } from '../../hooks/useAuth'
import { ROLES } from '../../lib/constants'
import { Shield, User, Search } from 'lucide-react'
import { format } from 'date-fns'

export default function AdminUsers() {
  const toast = useToast()
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
      setUsers(data || [])
      setLoading(false)
    }
    load()
  }, [])

  async function updateRole(id, role) {
    if (id === currentUser.id) { toast("You can't change your own role", 'error'); return }
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
    if (error) { toast(error.message, 'error'); return }
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u))
    toast('Role updated', 'success')
  }

  const filtered = search ? users.filter(u => u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())) : users

  const ROLE_COLORS = { admin: 'badge-red', approver: 'badge-yellow', viewer: 'badge-blue' }

  if (loading) return <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Users</h1>
        <p className="page-subtitle">{users.length} registered accounts</p>
      </div>

      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 400 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
        <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Joined</th><th>Change Role</th></tr></thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={14} color="var(--text-muted)" />
                      </div>
                      <span style={{ fontWeight: 500 }}>{u.full_name || '—'}</span>
                      {u.id === currentUser.id && <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>(you)</span>}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{u.email}</td>
                  <td><span className={'badge ' + (ROLE_COLORS[u.role] || 'badge-gray')}><Shield size={10} />{u.role}</span></td>
                  <td style={{ fontSize: 12, fontFamily: 'Space Mono', color: 'var(--text-dim)' }}>{u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '—'}</td>
                  <td>
                    <select className="form-input" style={{ width: 'auto', padding: '4px 10px', fontSize: 13 }} value={u.role || 'viewer'} onChange={e => updateRole(u.id, e.target.value)} disabled={u.id === currentUser.id}>
                      <option value="viewer">Viewer</option>
                      <option value="approver">Approver</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No users found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
