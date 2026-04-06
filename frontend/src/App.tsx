import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Telescope, List, Plus, Star, Cloud } from 'lucide-react'
import { ToastProvider } from './components/Toast'
import ObservationsList from './pages/ObservationsList'
import ObservationDetail from './pages/ObservationDetail'
import NewObservation from './pages/NewObservation'
import TonightSky from './pages/TonightSky'
import SkyCheck from './pages/SkyCheck'
import SkyCheckList from './pages/SkyCheckList'

function NavBar() {
  const location = useLocation()
  const links = [
    { to: '/', label: 'Tonight', icon: Star, shortLabel: 'Tonight' },
    { to: '/sky-check', label: 'Sky Check', icon: Cloud, shortLabel: 'Check' },
    { to: '/journal', label: 'Journal', icon: List, shortLabel: 'Journal' },
    { to: '/new', label: 'New Session', icon: Plus, shortLabel: 'New' },
  ]
  
  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="border-b border-[hsl(215_15%_18%)] px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2 sm:gap-6 sticky top-0 bg-[hsl(220_20%_6%)]/95 backdrop-blur-sm z-40">
      <Link to="/" className="flex items-center gap-1.5 sm:gap-2 font-bold text-base sm:text-lg hover:opacity-80 transition-opacity shrink-0">
        <Telescope className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="hidden sm:inline">StellarLog</span>
        <span className="sm:hidden">SL</span>
      </Link>
      
      <div className="flex items-center gap-1 sm:gap-2 ml-auto">
        {links.map(({ to, label, shortLabel, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 rounded-md transition-all duration-200 shrink-0 ${
              isActive(to)
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-gray-500 hover:text-gray-300 hover:bg-[hsl(220_15%_14%)]'
            }`}
          >
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{shortLabel}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[hsl(220_20%_6%)] text-gray-100 overflow-x-hidden">
          <NavBar />
          <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
            <Routes>
              <Route path="/" element={<TonightSky />} />
              <Route path="/sky-check" element={<SkyCheck />} />
              <Route path="/sky-checks" element={<SkyCheckList />} />
              <Route path="/journal" element={<ObservationsList />} />
              <Route path="/new" element={<NewObservation />} />
              <Route path="/observations/:id" element={<ObservationDetail />} />
              <Route path="/observations/:id/edit" element={<NewObservation />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ToastProvider>
  )
}
