import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { Plus, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'

const PARAM_TYPES = ['string', 'number', 'boolean', 'array']

export default function EditScraper() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get(`/api/scrapers/${id}`).then(({ data }) => {
      setForm({
        name: data.name, description: data.description || '',
        language: data.language, file_content: data.file_content,
        parameters: data.parameters || [],
        pricing_type: data.pricing_type, price: data.price,
        tags: data.tags || [], is_public: !!data.is_public
      })
    }).catch(() => { toast.error('Not found'); navigate('/dashboard') })
  }, [id])

  if (!form) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const addParam = () => setField('parameters', [...form.parameters, { name: '', type: 'string', description: '', required: true }])
  const removeParam = (i) => setField('parameters', form.parameters.filter((_, idx) => idx !== i))
  const updateParam = (i, k, v) => setField('parameters', form.parameters.map((p, idx) => idx === i ? { ...p, [k]: v } : p))
  const addTag = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      const tag = tagInput.trim().toLowerCase()
      if (!form.tags.includes(tag)) setField('tags', [...form.tags, tag])
      setTagInput('')
    }
  }
  const removeTag = (tag) => setField('tags', form.tags.filter(t => t !== tag))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.put(`/api/scrapers/${id}`, form)
      toast.success('Scraper updated!')
      navigate(`/scrapers/${id}`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed')
    }
    setLoading(false)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-base">Edit Scraper</h1>
        <p className="text-muted mt-1">Update your scraper settings and code</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card space-y-5">
              <h2 className="font-semibold text-lg">Basic Information</h2>
              <div>
                <label className="label">Name *</label>
                <input className="input" required value={form.name} onChange={e => setField('name', e.target.value)} />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input resize-none" rows={3} value={form.description} onChange={e => setField('description', e.target.value)} />
              </div>
              <div>
                <label className="label">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.tags.map(tag => (
                    <span key={tag} className="badge bg-surface-3 text-muted border border-border flex items-center gap-1">
                      {tag} <button type="button" onClick={() => removeTag(tag)}><X size={10} /></button>
                    </span>
                  ))}
                </div>
                <input className="input" placeholder="Type tag and press Enter..." value={tagInput}
                  onChange={e => setTagInput(e.target.value)} onKeyDown={addTag} />
              </div>
            </div>

            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg">Code</h2>
                <div className="flex gap-2">
                  {['python', 'javascript'].map(lang => (
                    <button key={lang} type="button" onClick={() => setField('language', lang)}
                      className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${form.language === lang ? (lang === 'python' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30') : 'bg-surface-2 text-muted border border-border'}`}>
                      {lang === 'python' ? '🐍 Python' : '⚡ JS'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-xl overflow-hidden border border-border">
                <Editor height="400px" language={form.language === 'python' ? 'python' : 'javascript'}
                  value={form.file_content} onChange={v => setField('file_content', v || '')}
                  theme="vs-dark" options={{ minimap: { enabled: false }, fontSize: 13, fontFamily: 'JetBrains Mono, monospace', scrollBeyondLastLine: false, padding: { top: 12 } }} />
              </div>
            </div>

            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg">Parameters</h2>
                <button type="button" onClick={addParam} className="btn-secondary text-sm"><Plus size={14} /> Add</button>
              </div>
              {form.parameters.map((param, i) => (
                <div key={i} className="flex gap-3 items-start p-4 bg-surface-2 rounded-xl border border-border">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div>
                      <label className="label text-xs">Name</label>
                      <input className="input text-sm" value={param.name} onChange={e => updateParam(i, 'name', e.target.value)} />
                    </div>
                    <div>
                      <label className="label text-xs">Type</label>
                      <select className="input text-sm" value={param.type} onChange={e => updateParam(i, 'type', e.target.value)}>
                        {PARAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="label text-xs">Description</label>
                      <input className="input text-sm" value={param.description} onChange={e => updateParam(i, 'description', e.target.value)} />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-muted">
                      <input type="checkbox" checked={param.required} onChange={e => updateParam(i, 'required', e.target.checked)} className="accent-primary" />
                      Required
                    </label>
                  </div>
                  <button type="button" onClick={() => removeParam(i)} className="text-muted hover:text-danger transition-colors mt-1"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="card space-y-4">
              <h2 className="font-semibold">Pricing</h2>
              {[['free', 'Free', 'No charge'], ['one_time', 'One-time', 'Pay once'], ['per_run', 'Per Run', 'Per execution']].map(([v, l, d]) => (
                <label key={v} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form.pricing_type === v ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <input type="radio" name="pricing" value={v} checked={form.pricing_type === v} onChange={e => setField('pricing_type', e.target.value)} className="mt-0.5 accent-primary" />
                  <div><p className="text-sm font-medium">{l}</p><p className="text-xs text-muted">{d}</p></div>
                </label>
              ))}
              {form.pricing_type !== 'free' && (
                <div>
                  <label className="label">Price (credits)</label>
                  <input className="input" type="number" min="0" step="0.5" value={form.price} onChange={e => setField('price', parseFloat(e.target.value) || 0)} />
                </div>
              )}
            </div>
            <div className="card space-y-3">
              <h2 className="font-semibold">Visibility</h2>
              {[[true, 'Public', 'Listed in marketplace'], [false, 'Private', 'API key only']].map(([v, l, d]) => (
                <label key={String(v)} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form.is_public === v ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <input type="radio" checked={form.is_public === v} onChange={() => setField('is_public', v)} className="mt-0.5 accent-primary" />
                  <div><p className="text-sm font-medium">{l}</p><p className="text-xs text-muted">{d}</p></div>
                </label>
              ))}
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
              {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
