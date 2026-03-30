import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listObservations } from '@/lib/api'
import { format } from 'date-fns'
import { Moon, Cloud, Image, ChevronRight, Search, Telescope, Star } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { ObservationCardSkeleton } from '@/components/Skeleton'

function MoonBadge({ phase }: { phase: number | null }) {
  if (!phase) return null
  const pct = Math.round(phase * 100)
  const emoji = phase < 0.1 ? '🌑' : phase < 0.25 ? '🌒' : phase < 0.45 ? '🌓' : phase < 0.55 ? '🌕' : phase < 0.75 ? '🌖' : '🌗'
  return (
    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[hsl(220_15%_14%)] text-gray-400 border border-[hsl(215_15%_20%)]">
      {emoji} {pct}%
    </span>
  )
}

function WeatherBadge({ weatherJson }: { weatherJson: string | null }) {
  if (!weatherJson) return null
  try {
    const w = JSON.parse(weatherJson)
    return (
      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[hsl(220_15%_14%)] text-gray-400 border border-[hsl(215_15%_20%)]">
        <Cloud className="w-3 h-3" />
        {Math.round(w.temperature)}°C · {w.cloud_cover}% clouds
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Journal</h1>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Star className="w-4 h-4" />
            Tonight's Sky
          </Link>
        </div>
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
            style={{ marginTop: '-2px' }}
          />
          <input
            type="text"
            placeholder="Filter observations..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-lg text-sm w-56 bg-[hsl(220_15%_11%)] border border-[hsl(215_15%_22%)] text-gray-100 placeholder-gray-600 focus:border-blue-500/50 focus:outline-none transition-colors"
          />
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
          <div className="text-center py-16 text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No observations match &quot;{filter}&quot;</p>
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
        <div className="grid gap-3">
          {filtered.map(obs => (
            <Link
              key={obs.id}
              to={`/observations/${obs.id}`}
              className="block rounded-xl p-4 transition-all duration-200 group bg-[hsl(220_15%_8%)] border border-[hsl(215_15%_18%)] hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-lg">
                      {obs.target_catalog_id && (
                        <span className="mr-1 text-gray-500 font-mono">{obs.target_catalog_id}</span>
                      )}
                      {obs.target_name}
                    </span>
                    <MoonBadge phase={obs.moon_phase} />
                    {obs.photos.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Image className="w-3 h-3" />
                        {obs.photos.length}
                      </span>
                    )}
                  </div>
                  <p className="text-sm mt-0.5 text-gray-500">
                    {format(new Date(obs.date), 'EEEE, d MMMM yyyy')} · {obs.time}
                  </p>
                  {obs.notes_text && (
                    <p className="text-sm mt-2 line-clamp-2 text-gray-400">
                      {obs.notes_text}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <WeatherBadge weatherJson={obs.weather_json} />
                    {obs.seeing_rating && (
                      <span className="text-xs text-yellow-400/80">
                        {'★'.repeat(obs.seeing_rating)}{'☆'.repeat(5 - obs.seeing_rating)}
                      </span>
                    )}
                    {obs.location && (
                      <span className="text-xs text-gray-500">{obs.location}</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 shrink-0 mt-1 text-gray-600 group-hover:text-blue-400 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
