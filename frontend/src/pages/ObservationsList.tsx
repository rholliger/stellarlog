import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listObservations } from '@/lib/api'
import { format } from 'date-fns'
import { Moon, Cloud, Image, ChevronRight, Search, Telescope, Star } from 'lucide-react'

function MoonBadge({ phase }: { phase: number | null }) {
  if (!phase) return null
  const pct = Math.round(phase * 100)
  const emoji = phase < 0.1 ? '🌑' : phase < 0.25 ? '🌒' : phase < 0.45 ? '🌓' : phase < 0.55 ? '🌕' : phase < 0.75 ? '🌖' : '🌗'
  return (
    <span className="flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
      {emoji} {pct}%
    </span>
  )
}

function WeatherBadge({ weatherJson }: { weatherJson: string | null }) {
  if (!weatherJson) return null
  try {
    const w = JSON.parse(weatherJson)
    return (
      <span className="flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
        <Cloud className="w-3 h-3" />
        {Math.round(w.temperature)}°C · {w.cloud_cover}% clouds
      </span>
    )
  } catch {
    return null
  }
}

export default function ObservationsList() {
  const [filter, setFilter] = useState('')
  const navigate = useNavigate()
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Journal</h1>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Star className="w-4 h-4" /> Tonight's Sky
          </Link>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Filter observations..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="pl-9 pr-4 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-64"
          />
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading observations...</p>}

      {!filtered?.length && !isLoading && (
        <div className="text-center py-20 text-muted-foreground">
          <Telescope className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No observations yet.</p>
          <Link to="/new" className="text-primary hover:underline mt-2 inline-block">
            Log your first session →
          </Link>
        </div>
      )}

      <div className="grid gap-3">
        {filtered?.map(obs => (
          <Link
            key={obs.id}
            to={`/observations/${obs.id}`}
            className="block border border-border rounded-xl p-4 hover:border-primary/50 hover:bg-primary/5 transition-all group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-lg">
                    {obs.target_catalog_id && (
                      <span className="text-muted-foreground mr-1">{obs.target_catalog_id}</span>
                    )}
                    {obs.target_name}
                  </span>
                  <MoonBadge phase={obs.moon_phase} />
                  {obs.photos.length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Image className="w-3 h-3" />
                      {obs.photos.length}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {format(new Date(obs.date), 'EEEE, d MMMM yyyy')} · {obs.time}
                </p>
                {obs.notes_text && (
                  <p className="text-sm mt-2 line-clamp-2 text-muted-foreground">
                    {obs.notes_text}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <WeatherBadge weatherJson={obs.weather_json} />
                  {obs.seeing_rating && (
                    <span className="text-xs text-muted-foreground">
                      Seeing: {'★'.repeat(obs.seeing_rating)}{'☆'.repeat(5 - obs.seeing_rating)}
                    </span>
                  )}
                  {obs.location && (
                    <span className="text-xs text-muted-foreground">{obs.location}</span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 mt-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
