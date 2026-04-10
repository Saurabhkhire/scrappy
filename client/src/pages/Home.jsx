import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search,  Globe, Zap, Shield, Plus, ChevronRight, Bug } from 'lucide-react'
import api from '../api/client'
import ScraperCard from '../components/ScraperCard'
import { useAuth } from '../context/AuthContext'

const LANGUAGES = [
  { value: '', label: 'All Languages' },
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
]
const PRICING = [
  { value: '', label: 'All Pricing' },
  { value: 'free', label: 'Free' },
  { value: 'one_time', label: 'One-time' },
  { value: 'per_run', label: 'Per Run' },
]

export default function Home() {
  const { user } = useAuth()
  const [scrapers, setScrapers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [language, setLanguage] = useState('')
  const [pricing, setPricing] = useState('')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)

  useEffect(() => {
    const timer = setTimeout(fetchScrapers, 300)
    return () => clearTimeout(timer)
  }, [search, language, pricing, page])

  async function fetchScrapers() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 12 })
      if (search) params.set('search', search)
      if (language) params.set('language', language)
      if (pricing) params.set('pricing', pricing)
      const { data } = await api.get(`/api/scrapers?${params}`)
      setScrapers(data.scrapers)
      setTotal(data.total)
      setPages(data.pages)
    } catch {}
    setLoading(false)
  }

  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-transparent to-transparent border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-xs font-medium text-primary mb-6">
              <Zap size={12} /> Web Scraper Marketplace
            </div>
            <h1 className="text-5xl sm:text-6xl font-extrabold text-text-base leading-tight mb-4">
              The App Store for<br /><span className="gradient-text">Web Scrapers</span>
            </h1>
            <p className="text-lg text-muted max-w-xl mb-8">
              Discover, share, and monetize web scrapers. Run any scraper with a single API call. Built by developers, for developers.
            </p>
            <div className="flex flex-wrap gap-3">
              {user ? (
                <Link to="/create" className="btn-primary text-base px-6 py-3">
                  <Plus size={18} /> Create Scraper
                </Link>
              ) : (
                <Link to="/register" className="btn-primary text-base px-6 py-3">
                  Get Started Free <ChevronRight size={16} />
                </Link>
              )}
              <a href="#marketplace" className="btn-secondary text-base px-6 py-3">
                Browse Scrapers
              </a>
            </div>
            <div className="flex items-center gap-6 mt-8">
              {[['Free 100 credits', Shield], ['Instant API', Globe], ['Python & JS', Zap]].map(([text, Icon]) => (
                <div key={text} className="flex items-center gap-2 text-sm text-muted">
                  <Icon size={14} className="text-primary" /> {text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Marketplace */}
      <div id="marketplace" className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="input pl-10"
              placeholder="Search scrapers by name, creator, or keyword..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <select className="input w-auto" value={language} onChange={e => { setLanguage(e.target.value); setPage(1) }}>
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
            <select className="input w-auto" value={pricing} onChange={e => { setPricing(e.target.value); setPage(1) }}>
              {PRICING.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-text-base">
            {search ? `Results for "${search}"` : 'All Scrapers'}
            <span className="ml-2 text-base font-normal text-muted">({total})</span>
          </h2>
          {user && (
            <Link to="/create" className="btn-ghost text-sm">
              <Plus size={14} /> Add yours
            </Link>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-5 bg-surface-3 rounded w-3/4 mb-3" />
                <div className="h-4 bg-surface-3 rounded w-1/2 mb-4" />
                <div className="h-12 bg-surface-3 rounded mb-4" />
                <div className="h-4 bg-surface-3 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : scrapers.length === 0 ? (
          <div className="text-center py-20">
            <Bug size={48} className="mx-auto text-muted/30 mb-4" />
            <p className="text-xl font-semibold text-muted">No scrapers found</p>
            <p className="text-sm text-muted/60 mt-2">Be the first to {search ? 'match this search' : 'add a scraper'}!</p>
            {user && <Link to="/create" className="btn-primary mt-6 inline-flex"><Plus size={16} /> Create Scraper</Link>}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {scrapers.map(s => <ScraperCard key={s.id} scraper={s} />)}
            </div>
            {pages > 1 && (
              <div className="flex justify-center gap-2 mt-10">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm px-4 py-2">Previous</button>
                <span className="flex items-center px-4 text-sm text-muted">Page {page} of {pages}</span>
                <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="btn-secondary text-sm px-4 py-2">Next</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
