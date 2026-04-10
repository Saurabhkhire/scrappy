import { useState, useEffect } from 'react'
import { CreditCard, Coins, Check, Zap, Shield, Star, Plus, Trash2, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Payments() {
  const { user, refreshUser } = useAuth()
  const [plans, setPlans] = useState([])
  const [methods, setMethods] = useState([])
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [cardForm, setCardForm] = useState({ card_number: '', expiry: '', cvc: '', card_holder: '' })
  const [loading, setLoading] = useState(false)
  const [showCardForm, setShowCardForm] = useState(false)

  useEffect(() => {
    api.get('/api/payments/plans').then(r => setPlans(r.data))
    api.get('/api/payments/methods').then(r => setMethods(r.data))
  }, [])

  const formatCard = (v) => v.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19)
  const formatExpiry = (v) => v.replace(/\D/g, '').replace(/^(.{2})(.+)/, '$1/$2').slice(0, 5)

  const handlePurchase = async () => {
    if (!selectedPlan) return toast.error('Select a plan')
    setLoading(true)
    try {
      const { data } = await api.post('/api/payments/purchase', { plan_id: selectedPlan.id })
      toast.success(`${data.credits_added} credits added! New balance: ${data.new_balance.toFixed(2)}`)
      await refreshUser()
      setSelectedPlan(null)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Purchase failed')
    }
    setLoading(false)
  }

  const handleAddCard = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/api/payments/methods', cardForm)
      setMethods(m => [...m, data])
      setCardForm({ card_number: '', expiry: '', cvc: '', card_holder: '' })
      setShowCardForm(false)
      toast.success('Card saved')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed')
    }
    setLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Buy Credits</h1>
        <p className="text-muted mt-1">Purchase credits to run scrapers and unlock premium features</p>
      </div>

      {/* Balance */}
      <div className="mb-8 p-6 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-2xl flex items-center justify-between">
        <div>
          <p className="text-muted text-sm">Current Balance</p>
          <p className="text-4xl font-bold gradient-text mt-1">{user?.credits?.toFixed(2)}</p>
          <p className="text-muted text-sm mt-1">credits</p>
        </div>
        <div className="w-16 h-16 bg-warning/10 border border-warning/20 rounded-2xl flex items-center justify-center">
          <Coins size={32} className="text-warning" />
        </div>
      </div>

      {/* Demo notice */}
      <div className="mb-8 p-4 bg-warning/5 border border-warning/20 rounded-xl flex items-start gap-3">
        <AlertTriangle size={18} className="text-warning shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-warning">Demo Mode</p>
          <p className="text-xs text-muted mt-0.5">Payments are simulated — no real charges will be made. In production, integrate with Stripe or another payment processor.</p>
        </div>
      </div>

      {/* Plans */}
      <h2 className="text-xl font-bold mb-4">Credit Packages</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {plans.map(plan => (
          <div key={plan.id} onClick={() => setSelectedPlan(plan)}
            className={`card cursor-pointer transition-all duration-200 relative ${selectedPlan?.id === plan.id ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10' : 'hover:border-primary/30'}`}>
            {plan.badge && (
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                <span className="badge bg-primary text-white border-primary text-xs px-3">{plan.badge}</span>
              </div>
            )}
            {selectedPlan?.id === plan.id && (
              <div className="absolute top-3 right-3 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                <Check size={12} className="text-white" />
              </div>
            )}
            <div className="text-center">
              <p className="font-bold text-text-base text-lg">{plan.name}</p>
              <div className="my-3">
                <span className="text-3xl font-extrabold text-text-base">{plan.credits}</span>
                <span className="text-muted text-sm ml-1">credits</span>
              </div>
              <p className="text-2xl font-bold text-primary">${plan.price_usd}</p>
              <p className="text-xs text-muted mt-1">${(plan.price_usd / plan.credits * 100).toFixed(2)}¢ per credit</p>
            </div>
          </div>
        ))}
      </div>

      {/* Payment Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Saved Cards */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Payment Methods</h3>
            <button onClick={() => setShowCardForm(!showCardForm)} className="btn-secondary text-sm py-1.5 px-3">
              <Plus size={14} /> Add Card
            </button>
          </div>

          {methods.length === 0 && !showCardForm && (
            <div className="text-center py-6 border-2 border-dashed border-border rounded-xl">
              <CreditCard size={32} className="mx-auto text-muted/30 mb-2" />
              <p className="text-sm text-muted">No payment methods saved</p>
            </div>
          )}

          {methods.map(m => (
            <div key={m.id} className="flex items-center justify-between p-3 bg-surface-2 rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-7 bg-surface-3 rounded flex items-center justify-center">
                  <CreditCard size={16} className="text-muted" />
                </div>
                <div>
                  <p className="text-sm font-medium">{m.brand} •••• {m.last_four}</p>
                  {m.is_default && <span className="text-xs text-primary">Default</span>}
                </div>
              </div>
            </div>
          ))}

          {showCardForm && (
            <form onSubmit={handleAddCard} className="space-y-3 p-4 bg-surface-2 rounded-xl border border-border">
              <p className="text-sm font-medium">New Card (Demo)</p>
              <div>
                <label className="label text-xs">Card Holder Name</label>
                <input className="input text-sm" placeholder="John Doe" required value={cardForm.card_holder}
                  onChange={e => setCardForm(f => ({ ...f, card_holder: e.target.value }))} />
              </div>
              <div>
                <label className="label text-xs">Card Number</label>
                <input className="input text-sm font-mono" placeholder="4242 4242 4242 4242" required
                  value={cardForm.card_number} onChange={e => setCardForm(f => ({ ...f, card_number: formatCard(e.target.value) }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Expiry</label>
                  <input className="input text-sm font-mono" placeholder="MM/YY" required
                    value={cardForm.expiry} onChange={e => setCardForm(f => ({ ...f, expiry: formatExpiry(e.target.value) }))} />
                </div>
                <div>
                  <label className="label text-xs">CVC</label>
                  <input className="input text-sm font-mono" placeholder="123" maxLength={4} required
                    value={cardForm.cvc} onChange={e => setCardForm(f => ({ ...f, cvc: e.target.value.replace(/\D/g, '') }))} />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center text-sm">
                {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save Card'}
              </button>
            </form>
          )}
        </div>

        {/* Purchase Summary */}
        <div className="card space-y-4">
          <h3 className="font-semibold">Order Summary</h3>
          {selectedPlan ? (
            <>
              <div className="p-4 bg-surface-2 rounded-xl border border-border">
                <div className="flex justify-between mb-2">
                  <span className="text-muted text-sm">{selectedPlan.name} Plan</span>
                  <span className="font-medium">${selectedPlan.price_usd}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-muted text-sm">Credits</span>
                  <span className="text-success font-medium">+{selectedPlan.credits}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between font-bold">
                  <span>Total</span><span>${selectedPlan.price_usd}</span>
                </div>
              </div>
              <button onClick={handlePurchase} disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
                {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><Zap size={16} /> Complete Purchase (Demo)</>}
              </button>
            </>
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
              <Star size={32} className="mx-auto text-muted/30 mb-2" />
              <p className="text-sm text-muted">Select a plan to continue</p>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-muted">
            <Shield size={12} className="text-success" />
            <span>Secure payment processing. All transactions encrypted.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
