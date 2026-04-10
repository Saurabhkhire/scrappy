import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import ScraperDetail from './pages/ScraperDetail'
import CreateScraper from './pages/CreateScraper'
import EditScraper from './pages/EditScraper'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'
import Payments from './pages/Payments'

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-base">
        <Navbar />
        <main className="pt-16">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/scrapers/:id" element={<ScraperDetail />} />
            <Route path="/create" element={<ProtectedRoute><CreateScraper /></ProtectedRoute>} />
            <Route path="/edit/:id" element={<ProtectedRoute><EditScraper /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  )
}
