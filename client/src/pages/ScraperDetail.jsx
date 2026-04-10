import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Play, Code, Globe, Clock, User, Download, Copy, Check, Edit, Trash2, Coins, Lock, ShoppingCart, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import CodeBlock from '../components/CodeBlock'

const TABS = ['Overview', 'Try It', 'API Integration', 'Run History']

export default function ScraperDetail() {
  const { id } = useParams()
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [scraper, setScraper] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Overview')
  const [inputs, setInputs] = useState({})
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState(null)
  const [runs, setRuns] = useState([])
  const [purchasing, setPurchasing] = useState(false)

  useEffect(() => { fetchScraper() }, [id])
  useEffect(() => { if (tab === 'Run History' && scraper) fetchRuns() }, [tab, scraper])

  async function fetchScraper() {
    try {
      const { data } = await api.get(`/api/scrapers/${id}`)
      setScraper(data)
      // Init inputs with empty values
      const initInputs = {}
      data.parameters?.forEach(p => { initInputs[p.name] = '' })
      setInputs(initInputs)
    } catch (err) {
      if (err.response?.status === 404) { toast.error('Scraper not found'); navigate('/') }
    }
    setLoading(false)
  }

  async function fetchRuns() {
    try {
      const { data } = await api.get(`/api/scrapers/${id}/runs`)
      setRuns(data)
    } catch {}
  }

  async function handleRun() {
    if (!user) return navigate('/login')
    setRunning(true)
    setRunResult(null)
    try {
      const { data } = await api.post(`/api/scrapers/${id}/run`, inputs)
      setRunResult({ success: true, ...data })
      refreshUser()
      toast.success(`Done in ${data.duration_ms}ms`)
    } catch (err) {
      const msg = err.response?.data?.error || 'Run failed'
      if (err.response?.data?.need_purchase) {
        setRunResult({ error: msg, need_purchase: true })
      } else {
        setRunResult({ error: msg })
      }
      toast.error(msg)
    }
    setRunning(false)
  }

  async function handlePurchase() {
    setPurchasing(true)
    try {
      await api.post(`/api/scrapers/${id}/purchase`)
      toast.success('Purchased! You can now run this scraper.')
      fetchScraper()
      refreshUser()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Purchase failed')
    }
    setPurchasing(false)
  }

  async function handleDelete() {
    if (!confirm('Delete this scraper? This cannot be undone.')) return
    try {
      await api.delete(`/api/scrapers/${id}`)
      toast.success('Scraper deleted')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed')
    }
  }

  function downloadCSV() {
    if (!runResult?.output) return
    const data = Array.isArray(runResult.output) ? runResult.output : [runResult.output]
    if (!data.length) return toast.error('No data to download')
    const keys = Object.keys(data[0])
    const csv = [keys.join(','), ...data.map(row => keys.map(k => JSON.stringify(row[k] ?? '')).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${scraper.name}_output.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!scraper) return null

  const isOwner = user?.id === scraper.creator_id
  const isAdmin = user?.is_admin
  const apiBase = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3001`
  const apiUrl = `${apiBase}/api/endpoint/${scraper.api_key}`
  const canRun = scraper.pricing_type !== 'one_time' || scraper.user_purchased || isOwner

  const curlSnippet = `curl -X POST "${apiUrl}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -d '${JSON.stringify(inputs, null, 2)}'`

  const jsSnippet = `const response = await fetch("${apiUrl}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_JWT_TOKEN"
  },
  body: JSON.stringify(${JSON.stringify(inputs, null, 2)})
});
const data = await response.json();
console.log(data.data); // Your scraped results`

  const pythonSnippet = `import requests

response = requests.post(
    "${apiUrl}",
    headers={"Authorization": "Bearer YOUR_JWT_TOKEN"},
    json=${JSON.stringify(inputs, null, 4).replace(/"([^"]+)":/g, '"$1":')}
)
data = response.json()
print(data["data"])  # Your scraped results`

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start gap-4 mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={`badge ${scraper.language === 'python' ? 'badge-python' : 'badge-javascript'}`}>
              {scraper.language === 'python' ? '🐍 Python' : '⚡ JavaScript'}
            </span>
            <span className={`badge ${scraper.pricing_type === 'free' ? 'badge-free' : scraper.pricing_type === 'one_time' ? 'badge-paid' : 'badge-per-run'}`}>
              {scraper.pricing_type === 'free' ? 'Free' : scraper.pricing_type === 'one_time' ? `${scraper.price} credits` : `${scraper.price} cr/run`}
            </span>
            {!scraper.is_public && <span className="badge bg-surface-3 text-muted border border-border">Private</span>}
          </div>
          <h1 className="text-3xl font-bold text-text-base mb-1">{scraper.name}</h1>
          <div className="flex items-center gap-4 text-sm text-muted">
            <span className="flex items-center gap-1.5"><User size={13} />{scraper.creator_name}</span>
            <span className="flex items-center gap-1.5"><Play size={13} />{scraper.runs_count} runs</span>
            <span className="flex items-center gap-1.5"><Clock size={13} />{new Date(scraper.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(isOwner || isAdmin) && (
            <>
              <Link to={`/edit/${id}`} className="btn-secondary text-sm"><Edit size={14} /> Edit</Link>
              <button onClick={handleDelete} className="btn-danger text-sm"><Trash2 size={14} /> Delete</button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border mb-8 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`tab shrink-0 ${tab === t ? 'tab-active' : ''}`}>{t}</button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <h3 className="font-semibold mb-3 text-text-base">Description</h3>
              <p className="text-muted leading-relaxed">{scraper.description || 'No description provided.'}</p>
            </div>
            {scraper.parameters?.length > 0 && (
              <div className="card">
                <h3 className="font-semibold mb-4 text-text-base">Input Parameters</h3>
                <div className="space-y-3">
                  {scraper.parameters.map(p => (
                    <div key={p.name} className="flex items-start justify-between p-3 bg-surface-2 rounded-lg border border-border">
                      <div>
                        <div className="flex items-center gap-2">
                          <code className="text-primary font-mono text-sm">{p.name}</code>
                          <span className="badge bg-surface-3 text-muted border border-border text-xs">{p.type}</span>
                          {p.required && <span className="badge bg-danger/10 text-danger border border-danger/20 text-xs">required</span>}
                        </div>
                        {p.description && <p className="text-xs text-muted mt-1">{p.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div className="card">
              <h3 className="font-semibold mb-3 text-text-base">Creator</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary/80 to-accent/80 rounded-full flex items-center justify-center text-white font-semibold">
                  {scraper.creator_name[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-text-base">{scraper.creator_name}</p>
                  {scraper.creator_bio && <p className="text-xs text-muted mt-0.5">{scraper.creator_bio}</p>}
                </div>
              </div>
            </div>
            <div className="card">
              <h3 className="font-semibold mb-3 text-text-base">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {scraper.tags?.length > 0
                  ? scraper.tags.map(t => <span key={t} className="badge bg-surface-3 text-muted border border-border">{t}</span>)
                  : <span className="text-sm text-muted">No tags</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'Try It' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="card">
              <h3 className="font-semibold mb-4 text-text-base">Input Parameters</h3>
              {scraper.parameters?.length > 0 ? (
                <div className="space-y-4">
                  {scraper.parameters.map(p => (
                    <div key={p.name}>
                      <label className="label">
                        {p.name}
                        {p.required && <span className="text-danger ml-1">*</span>}
                        <span className="text-xs font-normal text-muted ml-2">({p.type})</span>
                      </label>
                      {p.description && <p className="text-xs text-muted mb-1.5">{p.description}</p>}
                      {p.type === 'boolean' ? (
                        <select className="input" value={inputs[p.name] || 'false'} onChange={e => setInputs(i => ({ ...i, [p.name]: e.target.value === 'true' }))}>
                          <option value="true">true</option><option value="false">false</option>
                        </select>
                      ) : (
                        <input className="input" type={p.type === 'number' ? 'number' : 'text'}
                          placeholder={`Enter ${p.name}...`}
                          value={inputs[p.name] || ''}
                          onChange={e => setInputs(i => ({ ...i, [p.name]: p.type === 'number' ? parseFloat(e.target.value) || '' : e.target.value }))} />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">This scraper has no input parameters.</p>
              )}

              {!user && (
                <div className="mt-4 p-3 bg-surface-2 rounded-lg border border-border flex items-center gap-2 text-sm text-muted">
                  <Lock size={14} /> <Link to="/login" className="text-primary hover:underline">Sign in</Link> to run scrapers
                </div>
              )}

              {user && !canRun && (
                <div className="mt-4 p-4 bg-warning/5 border border-warning/20 rounded-xl">
                  <p className="text-sm font-medium text-warning flex items-center gap-2"><Lock size={14} /> Purchase Required</p>
                  <p className="text-xs text-muted mt-1">One-time fee: {scraper.price} credits</p>
                  <button onClick={handlePurchase} disabled={purchasing} className="btn-primary text-sm mt-3">
                    <ShoppingCart size={14} /> {purchasing ? 'Processing...' : `Buy for ${scraper.price} credits`}
                  </button>
                </div>
              )}

              {user && canRun && (
                <button onClick={handleRun} disabled={running} className="btn-primary w-full justify-center py-3 mt-4">
                  {running ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><Play size={16} /> Run Scraper</>}
                  {scraper.pricing_type === 'per_run' && !running && (
                    <span className="ml-2 text-sm opacity-70 flex items-center gap-1"><Coins size={12} />{scraper.price} cr</span>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-text-base">Output</h3>
                {runResult?.output && (
                  <div className="flex gap-2">
                    <button onClick={downloadCSV} className="btn-secondary text-xs py-1.5 px-3">
                      <Download size={12} /> CSV
                    </button>
                  </div>
                )}
              </div>

              {!runResult ? (
                <div className="text-center py-12 text-muted border-2 border-dashed border-border rounded-xl">
                  <Play size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Run the scraper to see output here</p>
                </div>
              ) : runResult.error ? (
                <div className="p-4 bg-danger/5 border border-danger/20 rounded-xl">
                  <p className="text-sm font-medium text-danger flex items-center gap-2"><AlertTriangle size={14} /> Error</p>
                  <p className="text-xs text-muted mt-2 font-mono">{runResult.error}</p>
                  {runResult.need_purchase && (
                    <button onClick={handlePurchase} disabled={purchasing} className="btn-primary text-sm mt-3">
                      <ShoppingCart size={14} /> Purchase to Run
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="badge bg-success/10 text-success border border-success/20">Success</span>
                    <span className="text-xs text-muted">{runResult.duration_ms}ms</span>
                    {runResult.credits_used > 0 && (
                      <span className="text-xs text-muted flex items-center gap-1"><Coins size={10} />-{runResult.credits_used} credits</span>
                    )}
                  </div>
                  <pre className="json-output rounded-xl">{JSON.stringify(runResult.output, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'API Integration' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="font-semibold mb-2 text-text-base">Endpoint URL</h3>
            <p className="text-xs text-muted mb-3">POST to this URL with your parameters as JSON body</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-surface-2 border border-border rounded-lg px-4 py-2.5 text-sm font-mono text-accent truncate">{apiUrl}</code>
              <button onClick={() => { navigator.clipboard.writeText(apiUrl); toast.success('Copied!') }}
                className="btn-secondary shrink-0 text-sm py-2.5"><Copy size={14} /></button>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-1 text-text-base">Authentication</h3>
            <p className="text-sm text-muted mb-4">Include a JWT token from login for paid scrapers. Free scrapers work without auth.</p>
            <CodeBlock code={'POST /api/auth/login\n{ "email": "...", "password": "..." }\n// Returns: { "token": "eyJ..." }'} label="Get your token" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CodeBlock code={curlSnippet} label="cURL" />
            <CodeBlock code={jsSnippet} label="JavaScript" />
            <CodeBlock code={pythonSnippet} label="Python" />
          </div>

          <div className="card">
            <h3 className="font-semibold mb-3 text-text-base">Response Format</h3>
            <CodeBlock code={`{
  "success": true,
  "run_id": "uuid",
  "scraper": "${scraper.name}",
  "duration_ms": 1234,
  "data": [ /* your scraped results */ ]
}`} label="Response" />
          </div>
        </div>
      )}

      {tab === 'Run History' && (
        <div className="card">
          <h3 className="font-semibold mb-4 text-text-base">Recent Runs</h3>
          {runs.length === 0 ? (
            <p className="text-muted text-center py-8">No runs yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-muted font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-muted font-medium">User</th>
                    <th className="text-left py-3 px-4 text-muted font-medium">Duration</th>
                    <th className="text-left py-3 px-4 text-muted font-medium">Via API</th>
                    <th className="text-left py-3 px-4 text-muted font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map(r => (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-surface-2 transition-colors">
                      <td className="py-3 px-4">
                        <span className={`badge ${r.status === 'success' ? 'bg-success/10 text-success border-success/20' : 'bg-danger/10 text-danger border-danger/20'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted">{r.username || 'Anonymous'}</td>
                      <td className="py-3 px-4 text-muted">{r.duration_ms ? `${r.duration_ms}ms` : '-'}</td>
                      <td className="py-3 px-4 text-muted">{r.via_api ? <Globe size={14} className="text-accent" /> : '-'}</td>
                      <td className="py-3 px-4 text-muted">{new Date(r.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
