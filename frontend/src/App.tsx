import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Telescope, List, Plus, Star } from 'lucide-react'
import ObservationsList from './pages/ObservationsList'
import ObservationDetail from './pages/ObservationDetail'
import NewObservation from './pages/NewObservation'
import TonightSky from './pages/TonightSky'

function NavBar() {
  const location = useLocation()
  const links = [
    { to: '/tonight', label: 'Tonight', icon: Star },
    { to: '/', label: 'Journal', icon: List },
    { to: '/new', label: 'New Session', icon: Plus },
  ]
  return (
    <nav className="border-b border-border px-4 py-3 flex items-center gap-6">
      <Link to="/tonight" className="flex items-center gap-2 font-bold text-lg">
        <Telescope className="w-5 h-5" />
        StellarLog
      </Link>
      {links.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${
            location.pathname === to
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Icon className="w-4 h-4" />
          {label}
        </Link>
      ))}
    </nav>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-foreground">
        <NavBar />
        <main className="max-w-5xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/tonight" element={<TonightSky />} />
            <Route path="/" element={<ObservationsList />} />
            <Route path="/new" element={<NewObservation />} />
            <Route path="/observations/:id" element={<ObservationDetail />} />
            <Route path="/observations/:id/edit" element={<NewObservation />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
