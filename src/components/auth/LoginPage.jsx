import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ALLOWED_EMAIL_DOMAINS } from '../../lib/constants'
import { Beaker, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const [mode, setMode] = useState('login') // login | register | forgot
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const validateEmail = (e) => ALLOWED_EMAIL_DOMAINS.some(d => e.endsWith('@' + d))

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setMessage('')

    if (!validateEmail(email)) {
      setError('Only @lilly.com or @network.lilly.com email addresses are allowed.')
      return
    }

    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else if (mode === 'register') {
        if (!name.trim()) { setError('Please enter your full name.'); setLoading(false); return }
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name } }
        })
        if (error) throw error
        setMessage('Account created! Check your email to confirm your address, then log in.')
        setMode('login')
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/reset-password'
        })
        if (error) throw error
        setMessage('Password reset email sent. Check your inbox.')
        setMode('login')
      }
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'radial-gradient(ellipse at 20% 50%, rgba(0,194,255,0.06) 0%, transparent 60%), var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, background: 'var(--accent-glow)', border: '1px solid rgba(0,194,255,0.3)', borderRadius: 16, marginBottom: 16 }}>
            <Beaker size={28} color="var(--accent)" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Lab Reservations</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: 14 }}>Eli Lilly — Equipment Booking System</p>
        </div>

        <div className="card" style={{ padding: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 24 }}>
            {mode === 'login' ? 'Sign in to your account' : mode === 'register' ? 'Create an account' : 'Reset password'}
          </h2>

          {error && <div style={{ background: 'rgba(255,77,109,0.1)', border: '1px solid rgba(255,77,109,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--danger)' }}>{error}</div>}
          {message && <div style={{ background: 'rgba(0,214,143,0.1)', border: '1px solid rgba(0,214,143,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--success)' }}>{message}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" type="text" placeholder="Jane Smith" value={name} onChange={e => setName(e.target.value)} required />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Email</label>
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
            <button className="btn btn-primary w-full btn-lg" type="submit" disabled={loading} style={{ marginTop: 4, justifyContent: 'center' }}>
              {loading ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : (
                <>{mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Send Reset Email'} <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mode === 'login' && (
              <>
                <button className="btn btn-ghost btn-sm" onClick={() => { setMode('forgot'); setError(''); setMessage('') }}>Forgot password?</button>
                <span>Don't have an account? <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }} onClick={() => { setMode('register'); setError(''); setMessage('') }}>Sign up</button></span>
              </>
            )}
            {mode !== 'login' && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setMode('login'); setError(''); setMessage('') }}>Back to sign in</button>
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--text-dim)' }}>
          Only @lilly.com and @network.lilly.com emails are permitted
        </p>
      </div>
    </div>
  )
}
