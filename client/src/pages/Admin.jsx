import { useState, useEffect } from 'react'
import { ShieldCheck, Users, Globe, Play, Coins, TrendingUp, Plus, Minus, Check, X, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'

const TABS = ['Overview', 'Users', 'Scrapers']

export default function Admin() {
  const [tab, setTab] = useState('Overview')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [scrapers, setScrapers] = useState([])
  const [creditModal, setCreditModal] = useState(null)
  const [creditAmount, setCreditAmount] = useState('')
  const [creditDesc, setCreditDesc] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (tab === 'Overview') fetchStats()
    else if (tab === 'Users') fetchUsers()
    else if (tab === 'Scrapers') fetchScrapers()
  }, [tab])

  async function fetchStats() {
    setLoading(true)
    try { const { data } = await api.get('/api/admin/stats'); setStats(data) } catch {}
    setLoading(false)
  }

  async function fetchUsers() {
    setLoading(true)
    try { const { data } = await api.get('/api/admin/users'); setUsers(data) } catch {}
    setLoading(false)
  }

  async function fetchScrapers() {
    setLoading(true)
    try { const { data } = await api.get('/api/admin/scrapers'); setScrapers(data) } catch {}
    setLoading(false)
  }

  async function grantCredits() {
    if (!creditAmount) return toast.error('Enter amount')
    try {
      await api.post('/api/admin/credits', {
        user_id: creditModal.id,
        amount: parseFloat(creditAmount),
        description: creditDesc
      })
      toast.success(`Credits updated for ${creditModal.username}`)
      setCreditModal(null); setCreditAmount(''); setCreditDesc('')
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed')
    }
  }

  async function toggleAdmin(userId, isAdmin) {
    try {
      await api.put(`/api/admin/users/${userId}`, { is_admin: !isAdmin })
      toast.success('Updated')
      fetchUsers()
    } catch {}
  }

  async function deleteUser(userId, username) {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return
    try {
      await api.delete(`/api/admin/users/${userId}`)
      toast.success('User deleted')
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center">
          <ShieldCheck size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted text-sm">Manage users, credits, and scrapers</p>
        </div>
      </div>

      <div className="flex gap-0 border-b border-border mb-8">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`tab ${tab === t ? 'tab-active' : ''}`}>{t}</button>
        ))}
      </div>

      {tab === 'Overview' && stats && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Total Users', value: stats.total_users, icon: <Users className="text-primary" /> },
              { label: 'Total Scrapers', value: stats.total_scrapers, icon: <Globe className="text-accent" /> },
              { label: 'Total Runs', value: stats.total_runs, icon: <Play className="text-success" /> },
              { label: "Runs Today", value: stats.runs_today, icon: <TrendingUp className="text-warning" /> },
              { label: 'Credits in System', value: stats.total_credits_in_system?.toFixed(0), icon: <Coins className="text-warning" /> },
            ].map(s => (
              <div key={s.label} className="card text-center">
                <div className="w-10 h-10 bg-surface-2 rounded-xl flex items-center justify-center mx-auto mb-2">{s.icon}</div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-semibold mb-4">Recent Runs</h3>
              <div className="space-y-2">
                {stats.recent_runs?.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{r.scraper_name}</p>
                      <p className="text-xs text-muted">{r.username || 'Anonymous'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge text-xs ${r.status === 'success' ? 'bg-success/10 text-success border-success/20' : 'bg-danger/10 text-danger border-danger/20'}`}>{r.status}</span>
                      <span className="text-xs text-muted">{new Date(r.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <h3 className="font-semibold mb-4">Top Scrapers</h3>
              <div className="space-y-3">
                {stats.top_scrapers?.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-surface-3 rounded-full flex items-center justify-center text-xs font-bold text-muted">{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted">{s.creator_name}</p>
                    </div>
                    <span className="text-sm font-bold text-primary">{s.runs_count} runs</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'Users' && (
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['User', 'Email', 'Credits', 'Scrapers', 'Runs', 'Admin', 'Actions'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-muted font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-border/50 hover:bg-surface-2 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-gradient-to-br from-primary/80 to-accent/80 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {u.username[0].toUpperCase()}
                          </div>
                          <span className="font-medium">{u.username}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted">{u.email}</td>
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1 font-medium text-warning">
                          <Coins size={12} />{u.credits?.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted">{u.scraper_count}</td>
                      <td className="py-3 px-4 text-muted">{u.run_count}</td>
                      <td className="py-3 px-4">
                        {u.is_admin
                          ? <span className="badge bg-primary/10 text-primary border-primary/20">Admin</span>
                          : <span className="text-muted">—</span>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setCreditModal(u)}
                            className="btn-secondary text-xs py-1 px-2"><Coins size={11} /> Credits</button>
                          <button onClick={() => toggleAdmin(u.id, u.is_admin)}
                            className={`text-xs py-1 px-2 rounded-lg border font-medium transition-colors ${u.is_admin ? 'bg-primary/10 text-primary border-primary/20 hover:bg-danger/10 hover:text-danger hover:border-danger/20' : 'bg-surface-2 text-muted border-border hover:text-primary hover:border-primary/20'}`}>
                            {u.is_admin ? 'Revoke' : 'Admin'}
                          </button>
                          <button onClick={() => deleteUser(u.id, u.username)}
                            className="btn-danger text-xs py-1 px-2"><Trash2 size={11} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'Scrapers' && (
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Name', 'Creator', 'Language', 'Pricing', 'Runs', 'Visibility', 'Created'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-muted font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scrapers.map(s => (
                    <tr key={s.id} className="border-b border-border/50 hover:bg-surface-2 transition-colors">
                      <td className="py-3 px-4 font-medium text-text-base">{s.name}</td>
                      <td className="py-3 px-4 text-muted">{s.creator_name}</td>
                      <td className="py-3 px-4">
                        <span className={`badge ${s.language === 'python' ? 'badge-python' : 'badge-javascript'}`}>{s.language}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`badge ${s.pricing_type === 'free' ? 'badge-free' : 'badge-paid'}`}>
                          {s.pricing_type === 'free' ? 'Free' : `${s.price} cr`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted">{s.runs_count}</td>
                      <td className="py-3 px-4">
                        {s.is_public ? <span className="badge bg-success/10 text-success border-success/20">Public</span> : <span className="badge bg-surface-3 text-muted border-border">Private</span>}
                      </td>
                      <td className="py-3 px-4 text-muted">{new Date(s.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Credit Modal */}
      {creditModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setCreditModal(null)}>
          <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-xl mb-1">Manage Credits</h3>
            <p className="text-muted text-sm mb-5">User: <span className="text-text-base font-medium">{creditModal.username}</span> · Current: <span className="text-warning font-medium">{creditModal.credits?.toFixed(2)}</span></p>
            <div className="space-y-4">
              <div>
                <label className="label">Amount (use negative to deduct)</label>
                <input className="input" type="number" step="0.5" placeholder="e.g. 500 or -50"
                  value={creditAmount} onChange={e => setCreditAmount(e.target.value)} />
              </div>
              <div>
                <label className="label">Description (optional)</label>
                <input className="input" placeholder="Reason for credit adjustment"
                  value={creditDesc} onChange={e => setCreditDesc(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <button onClick={grantCredits} className="btn-primary flex-1 justify-center">
                  <Check size={16} /> Apply
                </button>
                <button onClick={() => setCreditModal(null)} className="btn-secondary flex-1 justify-center">
                  <X size={16} /> Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
