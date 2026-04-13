import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listObservations } from '@/lib/api'
import { format } from 'date-fns'
import { Cloud, Image, ChevronRight, Search, Star, X } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { ObservationCardSkeleton } from '@/components/Skeleton'

function MoonBadge({ phase }: { phase: number | null }) {
  if (!phase) return null
  const pct = Math.round(phase * 100)
  const emoji = phase < 0.1 ? '🌑' : phase < 0.25 ? '🌒' : phase < 0.45 ? '🌓' : phase < 0.55 ? '🌕' : phase < 0.75 ? '🌖' : '🌗'
  return (
    <span className="flex items-center gap-1 text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-[hsl(220_15%_14%)] text-gray-400 border border-[hsl(215_15%_20%)] shrink-0">
      <span className="hidden sm:inline">{emoji}</span>
      <span>{pct}%</span>
    </span>
  )
}

function WeatherBadge({ weatherJson }: { weatherJson: string | null }) {
  if (!weatherJson) return null
  try {
    const w = JSON.parse(weatherJson)
    return (
      <span className="flex items-center gap-1 text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-[hsl(220_15%_14%)] text-gray-400 border border-[hsl(215_15%_20%)] shrink-0">
        <Cloud className="w-3 h-3" />
        <span className="hidden sm:inline">{Math.round(w.temperature)}°C · </span>
        <span>{w.cloud_cover}%</span>
      </span>
    )
  } catch { return null }
}

export default function ObservationsList() {
  const [filter, setFilter] = useState('')
  const { data: observations, isLoading } = useQuery({
    queryKey: ['observations'],
    queryFn: () => listObservations({ limit: 100 }),
  })

  const filtered = observations?.filter(
    o =>
      !filter ||
      o.target_name.toLowerCase().includes(filter.toLowerCase()) ||
      o.target_catalog_id?.toLowerCase().includes(filter.toLowerCase()) ||
      o.notes_text?.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div>
      {/* Header - stacked on mobile, row on desktop */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold">Journal</h1>
          <Link
            to="/"
            className="flex items-center gap-1 text-xs sm:text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Tonight's Sky</span>
            <span className="sm:hidden">Tonight</span>
          </Link>
        </div>
        
        {/* Search - full width on mobile */}
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Filter observations..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-full sm:w-56 pl-9 pr-9 py-2 rounded-lg text-sm bg-[hsl(220_15%_11%)] border border-[hsl(215_15%_22%)] text-gray-100 placeholder-gray-600 focus:border-blue-500/50 focus:outline-none transition-colors"
          />
          {filter && (
            <button
              onClick={() => setFilter('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          {[...Array(4)].map((_, i) => (
            <ObservationCardSkeleton key={i} />
          ))}
        </div>
      ) : !filtered?.length ? (
        filter ? (
          <div className="text-center py-12 sm:py-16 text-gray-500">
            <Search className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-30" />
            <p className="text-sm sm:text-base">No observations match &quot;{filter}&quot;</p>
            <button
              onClick={() => setFilter('')}
              className="text-blue-400 hover:text-blue-300 mt-2 text-sm"
            >
              Clear filter
            </button>
          </div>
        ) : (
          <EmptyState
            type="observations"
            action={{ label: 'Log your first session', to: '/new' }}
          />
        )
      ) : (
        <div className="grid gap-2 sm:gap-3">
          {filtered.map(obs => (
            <Link
              key={obs.id}
              to={`/observations/${obs.id}`}
              className="block rounded-xl p-3 sm:p-4 transition-all duration-200 group bg-[hsl(220_15%_8%)] border border-[hsl(215_15%_18%)] hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5 active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-2 sm:gap-4">
                <div className="flex-1 min-w-0 overflow-hidden">
                  {/* Title row */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="font-semibold text-base sm:text-lg truncate">
                      {obs.target_catalog_id && (
                        <span className="mr-1 text-gray-500 font-mono text-sm sm:text-base">{obs.target_catalog_id}</span>
                      )}
                      <span className="truncate">{obs.target_name}</span>
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <MoonBadge phase={obs.moon_phase} />
                      {obs.photos.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-gray-500 px-1.5 py-0.5 rounded-full bg-[hsl(220_15%_14%)] border border-[hsl(215_15%_20%)]">
                          <Image className="w-3 h-3" />
                          <span className="hidden sm:inline">{obs.photos.length}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Date */}
                  <p className="text-xs sm:text-sm mt-0.5 text-gray-500">
                    {format(new Date(obs.date), 'EEE, d MMM yyyy')} · {obs.time}
                  </p>
                  
                  {/* Notes - hidden on very small screens */}
                  {obs.notes_text && (
                    <p className="text-xs sm:text-sm mt-1.5 sm:mt-2 line-clamp-1 sm:line-clamp-2 text-gray-400">
                      {obs.notes_text}
                    </p>
                  )}
                  
                  {/* Metadata row */}
                  <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2 flex-wrap">
                    <WeatherBadge weatherJson={obs.weather_json} />
                    {obs.seeing_rating && (
                      <span className="text-xs text-yellow-400/80 shrink-0">
                        {'★'.repeat(obs.seeing_rating)}{'☆'.repeat(5 - obs.seeing_rating)}
                      </span>
                    )}
                    {obs.location && (
                      <span className="text-xs text-gray-500 truncate max-w-[100px] sm:max-w-none">
                        {obs.location}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-1 text-gray-600 group-hover:text-blue-400 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
