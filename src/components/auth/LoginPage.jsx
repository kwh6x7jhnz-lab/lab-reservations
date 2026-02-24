import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { FlaskConical, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [mode, setMode] = useState('login') // login | register | forgot
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signIn, signUp, sendPasswordReset } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    if (mode === 'forgot') {
      const { error } = await sendPasswordReset(email)
      if (error) {
        toast({ message: error.message, type: 'error' })
      } else {
        toast({ message: 'Password reset email sent! Check your inbox.', type: 'success', duration: 6000 })
        setMode('login')
      }
      setLoading(false)
      return
    }

    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) {
        toast({ message: error.message, type: 'error' })
      } else {
        navigate('/dashboard')
      }
    } else {
      if (!fullName.trim()) {
        toast({ message: 'Please enter your full name.', type: 'error' })
        setLoading(false)
        return
      }
      const { error } = await signUp(email, password, fullName)
      if (error) {
        toast({ message: error.message, type: 'error' })
      } else {
        toast({ message: 'Account created! Check your email to verify, then sign in.', type: 'success', duration: 6000 })
        setMode('login')
      }
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

      {/* Glow */}
      <div style={{
        position: 'absolute', width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,212,170,0.06) 0%, transparent 70%)',
        top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none'
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

        {/* Card */}
        <div className="card" style={{ boxShadow: 'var(--shadow)' }}>

          {mode === 'forgot' ? (
            <>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 6 }}>Reset Password</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>
                  Enter your email and we'll send you a link to set a new password.
                </p>
              </div>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="you@lilly.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 8 }}>
                  {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : null}
                  Send Reset Link
                </button>
              </form>
              <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.8rem', color: 'var(--text-3)' }}>
                <button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}>
                  Back to Sign In
                </button>
              </p>
            </>
          ) : (
            <>
              {/* Tabs */}
              <div style={{ display: 'flex', gap: 0, marginBottom: 28, background: 'var(--bg-3)', borderRadius: 8, padding: 4 }}>
                {['login', 'register'].map(m => (
                  <button key={m} onClick={() => setMode(m)} style={{
                    flex: 1, padding: '8px', border: 'none', cursor: 'pointer', borderRadius: 6,
                    background: mode === m ? 'var(--bg-2)' : 'transparent',
                    color: mode === m ? 'var(--text)' : 'var(--text-2)',
                    fontSize: '0.875rem', fontWeight: 500, transition: 'all 150ms',
                    boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.3)' : 'none'
                  }}>
                    {m === 'login' ? 'Sign In' : 'Create Account'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {mode === 'register' && (
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Jane Smith"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="you@lilly.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                  {mode === 'register' && (
                    <span className="form-hint">Must be a @lilly.com or @network.lilly.com email</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="form-input"
                      type={showPw ? 'text' : 'password'}
                      placeholder={mode === 'register' ? 'Min. 8 characters' : '••••••••'}
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

                <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 8 }}>
                  {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : null}
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              </form>

              {mode === 'login' && (
                <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.8rem', color: 'var(--text-3)' }}>
                  <button onClick={() => setMode('forgot')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}>
                    Forgot password?
                  </button>
                </p>
              )}

              {mode === 'login' && (
                <p style={{ textAlign: 'center', marginTop: 8, fontSize: '0.8rem', color: 'var(--text-3)' }}>
                  Don't have an account?{' '}
                  <button onClick={() => setMode('register')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}>
                    Create one
                  </button>
                </p>
              )}
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.75rem', color: 'var(--text-3)' }}>
          For support, contact your lab administrator
        </p>
      </div>
    </div>
  )
} 
