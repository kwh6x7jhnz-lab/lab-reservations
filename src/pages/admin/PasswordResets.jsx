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
  const [tempPasswords, setTempPasswords] = useState({})

  useEffect(() => { load() }, [])

  async function load() {
    const { data: requestData } = await supabase
      .from('password_reset_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (!requestData) { setLoading(false); return }

    // For requests with a real user_id, try to get profile
    const realUserIds = requestData
      .filter(r => r.user_id !== '00000000-0000-0000-0000-000000000000')
      .map(r => r.user_id)

    let profileMap = {}
    if (realUserIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', realUserIds)
      if (profiles) profiles.forEach(p => { profileMap[p.id] = p })
    }

    setRequests(requestData.map(r => ({
      ...r,
      profile: profileMap[r.user_id] || null,
      displayEmail: r.email || profileMap[r.user_id]?.email || 'Unknown',
      displayName: profileMap[r.user_id]?.full_name || r.email || 'Unknown User',
    })))
    setLoading(false)
  }

  async function handleReset(request) {
    const tempPassword = tempPasswords[request.id]
    if (!tempPassword || tempPassword.length < 8) {
      toast('Please enter a temporary password (min 8 characters)', 'error')
      return
    }

    // Find the actual user_id by email if we used the placeholder
    let userId = request.user_id
    if (userId === '00000000-0000-0000-0000-000000000000') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', request.email)
        .single()
      if (!profile) { toast('Could not find user account for this email', 'error'); return }
      userId = profile.id
    }

    setProcessing(request.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          userId,
          newPassword: tempPassword,
          requestId: request.id,
        }),
      })
      const result = await response.json()
      if (result.error) throw new Error(result.error)

      setRequests(prev => prev.filter(r => r.id !== request.id))
      toast(`Password reset for ${request.displayName}. Let them know their temp password.`, 'success')
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
                {r.message && (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic', background: 'var(--bg-elevated)', padding: '6px 10px', borderRadius: 6 }}>
                    "{r.message}"
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
                  <input
                    className="form-input"
                    style={{ maxWidth: 240, fontSize: 13 }}
                    type="text"
                    placeholder="Set temporary password..."
                    value={tempPasswords[r.id] || ''}
                    onChange={e => setTempPasswords(prev => ({ ...prev, [r.id]: e.target.value }))}
                  />
                  <button className="btn btn-primary btn-sm" onClick={() => handleReset(r)} disabled={processing === r.id}>
                    {processing === r.id
                      ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                      : <><Key size={14} /> Set Password</>}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => dismissRequest(r.id)}>
                    <X size={14} /> Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
