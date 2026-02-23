import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ALLOWED_EMAIL_DOMAINS } from '../../lib/constants'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import LILLY_LOGO from '../../lib/logo'

export default function LoginPage() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [forgotMessage, setForgotMessage] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const validateEmail = (e) => ALLOWED_EMAIL_DOMAINS.some(d => e.endsWith('@' + d))

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setMessage('')
    if (!validateEmail(email)) { setError('Only @lilly.com or @network.lilly.com email addresses are allowed.'); return }
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else if (mode === 'register') {
        if (!name.trim()) { setError('Please enter your full name.'); setLoading(false); return }
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
        if (error) throw error
        setMessage('Account created! You can now sign in.')
        setMode('login')
      } else if (mode === 'forgot') {
        const { error } = await supabase.from('password_reset_requests').insert({
          user_id: '00000000-0000-0000-0000-000000000000',
          email: email,
          message: forgotMessage || null,
          status: 'pending',
        })
        if (error) throw error
        setMessage('Reset request submitted! Your lab admin will set a temporary password for you.')
        setMode('login')
      }
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'linear-gradient(135deg, #fff5f5 0%, #fff0f0 100%)' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 140, height: 64, background: '#fff', border: '1px solid rgba(208,33,42,0.15)', borderRadius: 16, marginBottom: 16, boxShadow: '0 4px 12px rgba(208,33,42,0.1)', padding: '10px 20px' }}>
            <img src={LILLY_LOGO} alt="Lilly" style={{ height: 38, objectFit: 'contain' }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>Lab Equipment Reservations</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: 14 }}>Eli Lilly — Internal Booking System</p>
        </div>

        <div className="card" style={{ padding: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 24, color: 'var(--text)' }}>
            {mode === 'login' ? 'Sign in to your account' : mode === 'register' ? 'Create an account' : 'Request Password Reset'}
          </h2>

          {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--danger)' }}>{error}</div>}
          {message && <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--success)' }}>{message}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" type="text" placeholder="Jane Smith" value={name} onChange={e => setName(e.target.value)} required />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Lilly Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input className="form-input" style={{ paddingLeft: 38 }} type="email" placeholder="you@lilly.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
            </div>
            {mode !== 'forgot' && (
              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                  <input className="form-input" style={{ paddingLeft: 38, paddingRight: 38 }} type={showPass ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}
            {mode === 'forgot' && (
              <div className="form-group">
                <label className="form-label">Message to admin (optional)</label>
                <input className="form-input" type="text" placeholder="e.g. I forgot my password" value={forgotMessage} onChange={e => setForgotMessage(e.target.value)} />
              </div>
            )}
            <button className="btn btn-primary w-full btn-lg" type="submit" disabled={loading} style={{ marginTop: 4, justifyContent: 'center' }}>
              {loading ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : <>{mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Submit Request'} <ArrowRight size={16} /></>}
            </button>
          </form>

          <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mode === 'login' && (<>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text-dim)', fontSize: 12 }} onClick={() => { setMode('forgot'); setError(''); setMessage('') }}>Forgot password?</button>
              <span>Don't have an account? <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }} onClick={() => { setMode('register'); setError(''); setMessage('') }}>Sign up</button></span>
            </>)}
            {mode !== 'login' && <button className="btn btn-ghost btn-sm" onClick={() => { setMode('login'); setError(''); setMessage('') }}>Back to sign in</button>}
          </div>
        </div>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--text-dim)' }}>Only @lilly.com and @network.lilly.com emails are permitted</p>
      </div>
    </div>
  )
}
