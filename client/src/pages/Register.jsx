import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Bug, Mail, Lock, User, Eye, EyeOff, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Register() {
  const { register, resendVerification } = useAuth()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [resending, setResending] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters')
    setLoading(true)
    try {
      await register(form.username, form.email, form.password)
      setSubmitted(true)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed')
    }
    setLoading(false)
  }

  const handleResend = async () => {
    setResending(true)
    try {
      await resendVerification(form.email)
      toast.success('Verification email resent!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to resend email')
    }
    setResending(false)
  }

  if (submitted) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-in text-center">
          <div className="w-16 h-16 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} className="text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-text-base mb-2">Check your email</h1>
          <p className="text-muted mb-2">
            We sent a verification link to
          </p>
          <p className="font-semibold text-primary mb-6">{form.email}</p>
          <p className="text-sm text-muted mb-8">
            Click the link in the email to activate your account. It expires in 24 hours.
          </p>
          <button onClick={handleResend} disabled={resending}
            className="btn-secondary text-sm">
            {resending ? 'Sending...' : "Didn't get it? Resend email"}
          </button>
          <p className="text-center text-muted text-sm mt-6">
            Already verified?{' '}
            <Link to="/login" className="text-primary hover:text-primary-light transition-colors font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-in">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
            <Bug size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-text-base">Create account</h1>
          <p className="text-muted mt-2">Join Scrappy and start scraping</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Username</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input className="input pl-10" type="text" placeholder="yourname" required
                  value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
              </div>
            </div>
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
                <input className="input pl-10 pr-10" type={showPass ? 'text' : 'password'} placeholder="Min 6 characters" required
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-text-base transition-colors">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
              {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-muted text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:text-primary-light transition-colors font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
