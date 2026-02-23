import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { format } from 'date-fns'
import { Key, CheckCircle, Clock, X } from 'lucide-react'

export default function PasswordResets() {
  const toast = useToast()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: requestData } = await supabase
      .from('password_reset_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (!requestData) { setLoading(false); return }

    const emails = requestData.map(r => r.email).filter(Boolean)
    let profileMap = {}
    if (emails.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('email', emails)
      if (profiles) profiles.forEach(p => { profileMap[p.email.toLowerCase()] = p })
    }

    setRequests(requestData.map(r => ({
      ...r,
      displayEmail: r.email || 'Unknown',
      displayName: profileMap[r.email?.toLowerCase()]?.full_name || r.email || 'Unknown User',
    })))
    setLoading(false)
  }

  async function approveReset(request) {
    setProcessing(request.id)
    try {
      const { data: profile } = await supabase.from('profiles').select('id').ilike('email', request.email).single()
      if (!profile) throw new Error('Could not find user account for this email')

      const { error } = await supabase.from('profiles').update({ must_change_password: true }).eq('id', profile.id)
      if (error) throw error

      await supabase.from('password_reset_requests').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', request.id)

      setRequests(prev => prev.filter(r => r.id !== request.id))
      toast(`Reset approved for ${request.displayName}. They will be prompted to set a new password on next login.`, 'success')
    } catch (err) {
      toast(err.message, 'error')
    }
    setProcessing(null)
  }

  async function dismissRequest(id) {
    await supabase.from('password_reset_requests').update({ status: 'dismissed' }).eq('id', id)
    setRequests(prev => prev.filter(r => r.id !== id))
    toast('Request dismissed', 'success')
  }

  if (loading) return <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Password Reset Requests</h1>
        <p className="page-subtitle">{requests.length} pending request{requests.length !== 1 ? 's' : ''}</p>
      </div>

      {requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          <CheckCircle size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div style={{ fontSize: 18, fontWeight: 600 }}>No pending requests</div>
          <div style={{ fontSize: 14, marginTop: 6 }}>All password reset requests have been handled.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {requests.map(r => (
            <div key={r.id} className="card" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-glow)', border: '1px solid rgba(208,33,42,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Key size={18} color="var(--accent)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{r.displayName}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{r.displayEmail}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={11} /> Requested {format(new Date(r.created_at), 'MMM d, h:mm a')}
                </div>
                {r.message && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic', background: 'var(--bg-elevated)', padding: '6px 10px', borderRadius: 6 }}>"{r.message}"</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => approveReset(r)} disabled={processing === r.id}>
                    {processing === r.id ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : <><Key size={14} /> Approve Reset</>}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => dismissRequest(r.id)} disabled={processing === r.id}>
                    <X size={14} /> Dismiss
                  </button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>ℹ️ User will be prompted to set a new password on their next login</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
