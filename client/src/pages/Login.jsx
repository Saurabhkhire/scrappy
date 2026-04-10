import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Bug, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Login() {
  const { login, resendVerification } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [unverifiedEmail, setUnverifiedEmail] = useState(null)
  const [resending, setResending] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setUnverifiedEmail(null)
    try {
      await login(form.email, form.password)
      toast.success('Welcome back!')
      navigate('/')
    } catch (err) {
      const data = err.response?.data
      if (data?.unverified) {
        setUnverifiedEmail(data.email || form.email)
      } else {
        toast.error(data?.error || 'Login failed')
      }
    }
    setLoading(false)
  }

  const handleResend = async () => {
    setResending(true)
    try {
      await resendVerification(unverifiedEmail)
      toast.success('Verification email sent! Check your inbox.')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to resend email')
    }
    setResending(false)
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-in">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
            <Bug size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-text-base">Welcome back</h1>
          <p className="text-muted mt-2">Sign in to your Scrappy account</p>
        </div>

        {unverifiedEmail && (
          <div className="mb-4 p-4 bg-warning/10 border border-warning/30 rounded-xl">
            <p className="text-sm font-semibold text-warning mb-1">Email not verified</p>
            <p className="text-xs text-muted mb-3">
              Check your inbox for the verification link, or request a new one.
            </p>
            <button onClick={handleResend} disabled={resending}
              className="btn-secondary text-xs py-1.5 px-3">
              {resending ? 'Sending...' : 'Resend verification email'}
            </button>
          </div>
        )}

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input className="input pl-10" type="email" placeholder="you@example.com" required
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input className="input pl-10 pr-10" type={showPass ? 'text' : 'password'} placeholder="••••••••" required
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-text-base transition-colors">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
              {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-muted text-sm mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary hover:text-primary-light transition-colors font-medium">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  )
}
