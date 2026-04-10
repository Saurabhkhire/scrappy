import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Edit, Trash2, Play, Coins, TrendingUp, ShoppingBag, Clock, Globe, Lock, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

const TABS = ['My Scrapers', 'Purchases', 'Transactions', 'Runs']

export default function Dashboard() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('My Scrapers')
  const [scrapers, setScrapers] = useState([])
  const [purchases, setPurchases] = useState([])
  const [transactions, setTransactions] = useState([])
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchTab() }, [tab])

  async function fetchTab() {
    setLoading(true)
    try {
      if (tab === 'My Scrapers') {
        const { data } = await api.get('/api/users/me/scrapers')
        setScrapers(data)
      } else if (tab === 'Purchases') {
        const { data } = await api.get('/api/users/me/purchases')
        setPurchases(data)
      } else if (tab === 'Transactions') {
        const { data } = await api.get('/api/users/me/transactions')
        setTransactions(data)
      } else if (tab === 'Runs') {
        const { data } = await api.get('/api/users/me/runs')
        setRuns(data)
      }
    } catch {}
    setLoading(false)
  }

  async function deleteScraper(id, name) {
    if (!confirm(`Delete "${name}"?`)) return
    try {
      await api.delete(`/api/scrapers/${id}`)
      toast.success('Deleted')
      setScrapers(s => s.filter(x => x.id !== id))
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed')
    }
  }

  const totalEarnings = transactions.filter(t => t.type === 'credit' || t.type === 'admin_grant').reduce((s, t) => s + t.amount, 0)
  const totalSpent = transactions.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted mt-1">Welcome back, <span className="text-primary">{user?.username}</span></p>
        </div>
        <Link to="/create" className="btn-primary"><Plus size={16} /> New Scraper</Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Credits Balance', value: user?.credits?.toFixed(2), icon: <Coins className="text-warning" />, sub: 'Available', accent: 'warning' },
          { label: 'My Scrapers', value: scrapers.length, icon: <Globe className="text-primary" />, sub: 'Published', accent: 'primary' },
          { label: 'Total Earnings', value: totalEarnings.toFixed(2), icon: <TrendingUp className="text-success" />, sub: 'Credits earned', accent: 'success' },
          { label: 'Total Spent', value: totalSpent.toFixed(2), icon: <ShoppingBag className="text-accent" />, sub: 'Credits used', accent: 'accent' },
        ].map(stat => (
          <div key={stat.label} className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted text-sm">{stat.label}</span>
              <div className="w-8 h-8 bg-surface-2 rounded-lg flex items-center justify-center">{stat.icon}</div>
            </div>
            <p className="text-2xl font-bold text-text-base">{loading && !stat.value ? '...' : stat.value}</p>
            <p className="text-xs text-muted mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`tab shrink-0 ${tab === t ? 'tab-active' : ''}`}>{t}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {tab === 'My Scrapers' && (
            scrapers.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-xl font-semibold text-muted mb-2">No scrapers yet</p>
                <p className="text-muted/60 text-sm mb-6">Create your first scraper and start earning credits</p>
                <Link to="/create" className="btn-primary inline-flex"><Plus size={16} /> Create Scraper</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {scrapers.map(s => (
                  <div key={s.id} className="card flex items-center justify-between gap-4 hover:border-primary/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-text-base truncate">{s.name}</h3>
                        <span className={`badge ${s.language === 'python' ? 'badge-python' : 'badge-javascript'}`}>{s.language}</span>
                        <span className={`badge ${s.is_public ? 'bg-success/10 text-success border-success/20' : 'bg-surface-3 text-muted border-border'}`}>
                          {s.is_public ? <Globe size={10} /> : <Lock size={10} />} {s.is_public ? 'Public' : 'Private'}
                        </span>
                        <span className={`badge ${s.pricing_type === 'free' ? 'badge-free' : 'badge-paid'}`}>
                          {s.pricing_type === 'free' ? 'Free' : s.pricing_type === 'one_time' ? `${s.price} cr` : `${s.price} cr/run`}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                        <span className="flex items-center gap-1"><Play size={10} />{s.runs_count} runs</span>
                        <span>{new Date(s.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link to={`/scrapers/${s.id}`} className="btn-ghost text-xs py-1.5 px-3"><ArrowUpRight size={13} /> View</Link>
                      <Link to={`/edit/${s.id}`} className="btn-secondary text-xs py-1.5 px-3"><Edit size={13} /></Link>
                      <button onClick={() => deleteScraper(s.id, s.name)} className="btn-danger text-xs py-1.5 px-3"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {tab === 'Purchases' && (
            purchases.length === 0 ? (
              <div className="text-center py-20">
                <ShoppingBag size={48} className="mx-auto text-muted/30 mb-4" />
                <p className="text-xl font-semibold text-muted">No purchases yet</p>
                <Link to="/" className="btn-primary inline-flex mt-6">Browse Marketplace</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {purchases.map(p => (
                  <div key={p.id} className="card flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-medium text-text-base">{p.name}</h3>
                      <p className="text-sm text-muted mt-0.5">by {p.creator_name} · {new Date(p.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-sm text-muted"><Coins size={12} className="text-warning" />{p.amount} credits</span>
                      <Link to={`/scrapers/${p.scraper_id}`} className="btn-secondary text-xs py-1.5 px-3"><Play size={12} /> Run</Link>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {tab === 'Transactions' && (
            transactions.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-xl font-semibold text-muted">No transactions</p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-muted font-medium">Type</th>
                      <th className="text-left py-3 px-4 text-muted font-medium">Description</th>
                      <th className="text-right py-3 px-4 text-muted font-medium">Amount</th>
                      <th className="text-right py-3 px-4 text-muted font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(t => {
                      const isCredit = ['credit', 'admin_grant'].includes(t.type)
                      return (
                        <tr key={t.id} className="border-b border-border/50 hover:bg-surface-2 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {isCredit
                                ? <ArrowDownLeft size={14} className="text-success" />
                                : <ArrowUpRight size={14} className="text-danger" />}
                              <span className={`text-xs font-medium ${isCredit ? 'text-success' : 'text-danger'}`}>{t.type}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-muted">{t.description}</td>
                          <td className={`py-3 px-4 text-right font-medium ${isCredit ? 'text-success' : 'text-danger'}`}>
                            {isCredit ? '+' : '-'}{t.amount.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right text-muted">{new Date(t.created_at).toLocaleString()}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}

          {tab === 'Runs' && (
            runs.length === 0 ? (
              <div className="text-center py-20">
                <Clock size={48} className="mx-auto text-muted/30 mb-4" />
                <p className="text-xl font-semibold text-muted">No runs yet</p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-muted font-medium">Scraper</th>
                      <th className="text-left py-3 px-4 text-muted font-medium">Status</th>
                      <th className="text-left py-3 px-4 text-muted font-medium">Duration</th>
                      <th className="text-left py-3 px-4 text-muted font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map(r => (
                      <tr key={r.id} className="border-b border-border/50 hover:bg-surface-2 transition-colors cursor-pointer" onClick={() => navigate(`/scrapers/${r.scraper_id}`)}>
                        <td className="py-3 px-4 font-medium text-text-base">{r.scraper_name}</td>
                        <td className="py-3 px-4">
                          <span className={`badge ${r.status === 'success' ? 'bg-success/10 text-success border-success/20' : 'bg-danger/10 text-danger border-danger/20'}`}>{r.status}</span>
                        </td>
                        <td className="py-3 px-4 text-muted">{r.duration_ms ? `${r.duration_ms}ms` : '-'}</td>
                        <td className="py-3 px-4 text-muted">{new Date(r.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </>
      )}
    </div>
  )
}
