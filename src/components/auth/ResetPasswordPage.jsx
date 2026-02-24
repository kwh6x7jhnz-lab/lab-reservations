import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { FlaskConical, Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const { user, mustChangePassword, updatePassword } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  // If someone navigates here directly without a valid session or reset reason, send them away
  useEffect(() => {
    if (!user) navigate('/login', { replace: true })
  }, [user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirm) {
      toast({ message: 'Passwords do not match.', type: 'error' })
      return
    }
    if (password.length < 8) {
      toast({ message: 'Password must be at least 8 characters.', type: 'error' })
      return
    }
    setLoading(true)
    const { error } = await updatePassword(password)
    if (error) {
      toast({ message: error.message, type: 'error' })
    } else {
      toast({ message: 'Password updated successfully!', type: 'success' })
      navigate('/dashboard', { replace: true })
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 24, position: 'relative', overflow: 'hidden'
    }}>
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.03,
        backgroundImage: 'linear-gradient(var(--text) 1px, transparent 1px), linear-gradient(90deg, var(--text) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40, justifyContent: 'center' }}>
          <div style={{
            width: 44, height: 44, background: 'var(--accent-dim)', border: '1px solid rgba(0,212,170,0.3)',
            borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <FlaskConical size={22} color="var(--accent)" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.3rem', letterSpacing: '-0.03em' }}>LabBook</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', letterSpacing: '0.06em' }}>LILLY BOSTON OPERATIONS</div>
          </div>
        </div>

        <div className="card" style={{ boxShadow: 'var(--shadow)' }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 6 }}>Set New Password</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>
              {mustChangePassword
                ? 'Your password needs to be updated before you can continue.'
                : 'Choose a new password for your account.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  minLength={8}
                  required
                  style={{ paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex' }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                className="form-input"
                type={showPw ? 'text' : 'password'}
                placeholder="Re-enter new password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                minLength={8}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : null}
              Update Password
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
