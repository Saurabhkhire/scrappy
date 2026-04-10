import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { Plus, Trash2, ChevronDown, ChevronUp, Info, Tag, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'

const PYTHON_TEMPLATE = `import sys
import json

def scrape(params):
    """
    Write your scraping logic here.
    params: dict of input parameters
    Returns: list or dict (will be serialized to JSON)
    """
    # Example: extract params
    # url = params.get('url', '')

    # Your scraping logic here...
    results = []

    return results

if __name__ == '__main__':
    params = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
    result = scrape(params)
    print(json.dumps(result))
`

const JS_TEMPLATE = `const params = JSON.parse(process.argv[2] || '{}');

async function scrape(params) {
  /**
   * Write your scraping logic here.
   * params: object of input parameters
   * Returns: array or object (will be serialized to JSON)
   */

  // Your scraping logic here...
  const results = [];

  return results;
}

scrape(params)
  .then(result => console.log(JSON.stringify(result)))
  .catch(err => { console.error(err.message); process.exit(1); });
`

const PARAM_TYPES = ['string', 'number', 'boolean', 'array']

export default function CreateScraper() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', description: '', language: 'python',
    file_content: PYTHON_TEMPLATE,
    parameters: [],
    pricing_type: 'free', price: 0,
    tags: [], is_public: true
  })
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(false)

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
    if (!form.name.trim()) return toast.error('Name is required')
    if (!form.file_content.trim()) return toast.error('File content is required')
    setLoading(true)
    try {
      const { data } = await api.post('/api/scrapers', form)
      toast.success('Scraper created successfully!')
      navigate(`/scrapers/${data.id}`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create scraper')
    }
    setLoading(false)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-base">Create Scraper</h1>
        <p className="text-muted mt-1">Build and publish your web scraper to the marketplace</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="card space-y-5">
              <h2 className="font-semibold text-text-base text-lg">Basic Information</h2>
              <div>
                <label className="label">Scraper Name *</label>
                <input className="input" placeholder="e.g. LinkedIn Job Scraper" required
                  value={form.name} onChange={e => setField('name', e.target.value)} />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input resize-none" rows={3} placeholder="Describe what this scraper does..."
                  value={form.description} onChange={e => setField('description', e.target.value)} />
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

            {/* Code Editor */}
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-text-base text-lg">Scraper Code</h2>
                <div className="flex gap-2">
                  {['python', 'javascript'].map(lang => (
                    <button key={lang} type="button"
                      onClick={() => { setField('language', lang); setField('file_content', lang === 'python' ? PYTHON_TEMPLATE : JS_TEMPLATE) }}
                      className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${form.language === lang ? (lang === 'python' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30') : 'bg-surface-2 text-muted hover:text-text-base border border-border'}`}>
                      {lang === 'python' ? '🐍 Python' : '⚡ JavaScript'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex gap-2.5">
                <Info size={15} className="text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted">
                  Your script receives input as the first argument (JSON string).
                  Output <strong className="text-text-base">must be valid JSON</strong> printed to stdout.
                  Use the template as a starting point.
                </p>
              </div>

              <div className="rounded-xl overflow-hidden border border-border">
                <Editor
                  height="400px"
                  language={form.language === 'python' ? 'python' : 'javascript'}
                  value={form.file_content}
                  onChange={v => setField('file_content', v || '')}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: 'JetBrains Mono, Fira Code, monospace',
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    padding: { top: 12 },
                    renderLineHighlight: 'all',
                  }}
                />
              </div>
            </div>

            {/* Parameters */}
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-text-base text-lg">Input Parameters</h2>
                  <p className="text-xs text-muted mt-0.5">Define what inputs your scraper accepts</p>
                </div>
                <button type="button" onClick={addParam} className="btn-secondary text-sm">
                  <Plus size={14} /> Add Parameter
                </button>
              </div>

              {form.parameters.length === 0 ? (
                <div className="text-center py-8 text-muted border-2 border-dashed border-border rounded-xl">
                  <p className="text-sm">No parameters defined yet</p>
                  <button type="button" onClick={addParam} className="btn-primary mt-3 text-sm">
                    <Plus size={14} /> Add First Parameter
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {form.parameters.map((param, i) => (
                    <div key={i} className="flex gap-3 items-start p-4 bg-surface-2 rounded-xl border border-border">
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <div>
                          <label className="label text-xs">Name *</label>
                          <input className="input text-sm" placeholder="param_name"
                            value={param.name} onChange={e => updateParam(i, 'name', e.target.value)} />
                        </div>
                        <div>
                          <label className="label text-xs">Type</label>
                          <select className="input text-sm" value={param.type} onChange={e => updateParam(i, 'type', e.target.value)}>
                            {PARAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="label text-xs">Description</label>
                          <input className="input text-sm" placeholder="What is this parameter for?"
                            value={param.description} onChange={e => updateParam(i, 'description', e.target.value)} />
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" id={`req-${i}`} checked={param.required}
                            onChange={e => updateParam(i, 'required', e.target.checked)}
                            className="w-4 h-4 accent-primary" />
                          <label htmlFor={`req-${i}`} className="text-sm text-muted">Required</label>
                        </div>
                      </div>
                      <button type="button" onClick={() => removeParam(i)} className="text-muted hover:text-danger transition-colors mt-1">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pricing */}
            <div className="card space-y-4">
              <h2 className="font-semibold text-text-base">Pricing</h2>
              <div className="space-y-2">
                {[
                  { value: 'free', label: 'Free', desc: 'Anyone can run for free' },
                  { value: 'one_time', label: 'One-time Purchase', desc: 'Pay once, run unlimited' },
                  { value: 'per_run', label: 'Per Run', desc: 'Credits deducted each run' },
                ].map(opt => (
                  <label key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form.pricing_type === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-surface-3'}`}>
                    <input type="radio" name="pricing" value={opt.value} checked={form.pricing_type === opt.value}
                      onChange={e => setField('pricing_type', e.target.value)} className="mt-0.5 accent-primary" />
                    <div>
                      <p className="text-sm font-medium text-text-base">{opt.label}</p>
                      <p className="text-xs text-muted">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              {form.pricing_type !== 'free' && (
                <div>
                  <label className="label">Price (credits)</label>
                  <input className="input" type="number" min="0" step="0.5"
                    value={form.price} onChange={e => setField('price', parseFloat(e.target.value) || 0)} />
                </div>
              )}
            </div>

            {/* Visibility */}
            <div className="card space-y-3">
              <h2 className="font-semibold text-text-base">Visibility</h2>
              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form.is_public ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <input type="radio" checked={form.is_public} onChange={() => setField('is_public', true)} className="mt-0.5 accent-primary" />
                <div>
                  <p className="text-sm font-medium text-text-base">Public</p>
                  <p className="text-xs text-muted">Listed in the marketplace</p>
                </div>
              </label>
              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${!form.is_public ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <input type="radio" checked={!form.is_public} onChange={() => setField('is_public', false)} className="mt-0.5 accent-primary" />
                <div>
                  <p className="text-sm font-medium text-text-base">Private</p>
                  <p className="text-xs text-muted">Only accessible via API key</p>
                </div>
              </label>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
              {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Publish Scraper'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
