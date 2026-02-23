import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { User, Lock, Shield, Save } from 'lucide-react'

export default function AccountPage() {
  const { user, profile } = useAuth()
  const toast = useToast()
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  async function saveProfile(e) {
    e.preventDefault()
    setSavingProfile(true)
    const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id)
    if (error) { toast(error.message, 'error') }
    else { toast('Profile updated!', 'success') }
    setSavingProfile(false)
  }

  async function changePassword(e) {
    e.preventDefault()
    if (newPassword !== confirmPassword) { toast('New passwords do not match', 'error'); return }
    if (newPassword.length < 8) { toast('Password must be at least 8 characters', 'error'); return }
    setSavingPassword(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword })
    if (signInError) { toast('Current password is incorrect', 'error'); setSavingPassword(false); return }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { toast(error.message, 'error') }
    else {
      toast('Password changed successfully!', 'success')
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    }
    setSavingPassword(false)
  }

  const ROLE_INFO = {
    admin: { label: 'Administrator', desc: 'Full access to all features, user management, and admin tools', color: 'var(--danger)' },
    approver: { label: 'Approver', desc: 'Can approve or reject booking requests for restricted equipment', color: 'var(--warning)' },
    viewer: { label: 'Viewer', desc: 'Can browse equipment and make booking requests', color: 'var(--accent)' },
  }
  const roleInfo = ROLE_INFO[profile?.role] || ROLE_INFO.viewer

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <div className="page-header">
        <h1 className="page-title">My Account</h1>
        <p className="page-subtitle">Manage your profile and account settings</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        <div className="card">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <Shield size={18} color="var(--accent)" />
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>Account Info</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Email</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{user?.email}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Role</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: roleInfo.color }}>{roleInfo.label}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{roleInfo.desc}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <User size={18} color="var(--accent)" />
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>Profile</h2>
          </div>
          <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" required />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={savingProfile}>
                {savingProfile ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : <><Save size={14} /> Save Profile</>}
              </button>
            </div>
          </form>
        </div>

        <div className="card">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <Lock size={18} color="var(--accent)" />
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>Change Password</h2>
          </div>
          <form onSubmit={changePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input className="form-input" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input className="form-input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" required minLength={8} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input className="form-input" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" required minLength={8} />
              {confirmPassword && newPassword !== confirmPassword && (
                <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>Passwords do not match</div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={savingPassword || newPassword !== confirmPassword}>
                {savingPassword ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : <><Lock size={14} /> Change Password</>}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  )
}
