import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { CheckCircle, XCircle, Loader } from 'lucide-react'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const { verifyEmail } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading') // loading | success | error
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setErrorMsg('No verification token found in this link.')
      setStatus('error')
      return
    }

    verifyEmail(token)
      .then(() => {
        setStatus('success')
        setTimeout(() => navigate('/'), 2500)
      })
      .catch(err => {
        setErrorMsg(err.response?.data?.error || 'Verification failed. The link may have expired.')
        setStatus('error')
      })
  }, []) // eslint-disable-line

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-in text-center">
        {status === 'loading' && (
          <>
            <Loader size={48} className="text-primary animate-spin mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-text-base mb-2">Verifying your email…</h1>
            <p className="text-muted">Just a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={32} className="text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-text-base mb-2">Email verified!</h1>
            <p className="text-muted mb-2">Your account is now active. You received 100 free credits.</p>
            <p className="text-sm text-muted">Redirecting you to the home page…</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle size={32} className="text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-text-base mb-2">Verification failed</h1>
            <p className="text-muted mb-6">{errorMsg}</p>
            <Link to="/register" className="btn-primary">
              Back to sign up
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
