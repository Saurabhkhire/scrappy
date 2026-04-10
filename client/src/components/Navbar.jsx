import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Bug, LayoutDashboard, Plus, LogOut, ShieldCheck, CreditCard, ChevronDown, Coins } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => { logout(); navigate('/'); setMenuOpen(false) }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-surface/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
            <Bug size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold gradient-text">Scrappy</span>
        </Link>

        {/* Center nav */}
        <div className="hidden md:flex items-center gap-1">
          <Link to="/" className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${location.pathname === '/' ? 'text-text-base bg-surface-2' : 'text-muted hover:text-text-base hover:bg-surface-2'}`}>
            Marketplace
          </Link>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link to="/create" className="hidden sm:flex btn-primary text-sm py-2">
                <Plus size={16} /> New Scraper
              </Link>
              <div ref={menuRef} className="relative">
                <button onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-2 transition-colors">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary/80 to-accent/80 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {user.username[0].toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-text-base leading-none">{user.username}</p>
                    <p className="text-xs text-muted flex items-center gap-1 mt-0.5"><Coins size={10} className="text-warning" />{user.credits?.toFixed(1)} credits</p>
                  </div>
                  <ChevronDown size={14} className="text-muted" />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-surface border border-border rounded-xl shadow-xl overflow-hidden animate-in z-50">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-semibold text-text-base">{user.username}</p>
                      <p className="text-xs text-muted mt-0.5">{user.email}</p>
                      <div className="mt-2 flex items-center gap-1.5 bg-warning/10 rounded-lg px-2 py-1">
                        <Coins size={12} className="text-warning" />
                        <span className="text-xs font-medium text-warning">{user.credits?.toFixed(2)} credits</span>
                      </div>
                    </div>
                    <div className="py-1">
                      <NavItem to="/dashboard" icon={<LayoutDashboard size={15} />} label="Dashboard" onClick={() => setMenuOpen(false)} />
                      <NavItem to="/create" icon={<Plus size={15} />} label="New Scraper" onClick={() => setMenuOpen(false)} className="sm:hidden" />
                      <NavItem to="/payments" icon={<CreditCard size={15} />} label="Buy Credits" onClick={() => setMenuOpen(false)} />
                      {user.is_admin && <NavItem to="/admin" icon={<ShieldCheck size={15} />} label="Admin Panel" onClick={() => setMenuOpen(false)} highlight />}
                    </div>
                    <div className="border-t border-border py-1">
                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger hover:bg-danger/10 transition-colors">
                        <LogOut size={15} /> Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost text-sm py-2 hidden sm:flex">Login</Link>
              <Link to="/register" className="btn-primary text-sm py-2">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

function NavItem({ to, icon, label, onClick, highlight, className = '' }) {
  return (
    <Link to={to} onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${highlight ? 'text-primary hover:bg-primary/10' : 'text-muted hover:text-text-base hover:bg-surface-2'} ${className}`}>
      {icon} {label}
    </Link>
  )
}
