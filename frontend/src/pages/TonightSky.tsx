import { useQuery } from '@tanstack/react-query'
import { getBestTonight, getMoon, getForecast, getWeather } from '@/lib/api'
import { Moon, Cloud, Star, Eye, Wind, Thermometer, Droplets, Sparkles, ExternalLink } from 'lucide-react'

function formatSwissDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}.${m}.${y}`
}

// Wikipedia link for DSO objects
function dsoWikiUrl(catalogId: string): string {
  const clean = catalogId.trim()
  // Caldwell: Wikipedia uses "Caldwell X" not "C X"
  const caldwellMatch = clean.match(/^C\s*(\d+)$/i)
  if (caldwellMatch) {
    return `https://en.wikipedia.org/wiki/Caldwell_${encodeURIComponent(caldwellMatch[1])}`
  }
  // Messier and NGC work as-is with spaces replaced by underscores
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(clean.replace(/\s+/g, '_'))}`
}

function moonIllumToStars(illumination: number): { stars: number; label: string; color: string } {
  if (illumination < 0.1) return { stars: 5, label: 'Perfect darkness', color: 'text-green-400' }
  if (illumination < 0.25) return { stars: 4, label: 'Dark moon', color: 'text-green-400' }
  if (illumination < 0.5) return { stars: 3, label: 'Moderate moonlight', color: 'text-yellow-400' }
  if (illumination < 0.75) return { stars: 2, label: 'Bright moon', color: 'text-orange-400' }
  return { stars: 1, label: 'Full moon', color: 'text-red-400' }
}

function MoonBadge({ illumination }: { illumination: number }) {
  const { stars, label, color } = moonIllumToStars(illumination)
  const emoji = illumination < 0.1 ? '🌑' : illumination < 0.25 ? '🌒' : illumination < 0.45 ? '🌓' : illumination < 0.55 ? '🌕' : illumination < 0.75 ? '🌖' : '🌗'
  return (
    <div className="flex items-center gap-3 bg-[hsl(220_15%_11%)] border border-[hsl(215_15%_18%)] rounded-xl px-4 py-3">
      <span className="text-2xl">{emoji}</span>
      <div>
        <p className="text-sm font-medium text-gray-200">{Math.round(illumination * 100)}% illuminated</p>
        <div className="flex items-center gap-1 mt-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={`w-3 h-3 ${i < stars ? color : 'text-gray-700'}`} fill={i < stars ? 'currentColor' : 'none'} />
          ))}
          <span className={`text-xs ml-1 ${color}`}>{label}</span>
        </div>
      </div>
    </div>
  )
}

function stargazingScore(day: any, moonIllum?: number): { score: number; stars: number; label: string; color: string; reasons: string[] } {
  let score = 10
  const reasons: string[] = []

  const cloudCover = day.cloud_cover || 100
  if (cloudCover < 20) { score += 3; reasons.push('Clear skies') }
  else if (cloudCover < 50) { score += 1; reasons.push('Patchy clouds') }
  else if (cloudCover < 80) { score -= 3; reasons.push('Cloudy') }
  else { score -= 6; reasons.push('Overcast') }

  const wind = day.wind_speed || 0
  if (wind > 30) { score -= 2; reasons.push('Windy') }
  else if (wind < 15) reasons.push('Calm')

  const dew = day.dew_point || day.dewpoint_celsius
  if (dew != null && dew > 10) { score -= 1; reasons.push('Dew risk') }

  const temp = (day.temp_min + day.temp_max) / 2
  if (temp < 0) { score -= 1; reasons.push('Frost risk') }
  else if (temp > 5 && temp < 20) score += 1

  // Moon penalty
  if (moonIllum != null) {
    const moonStars = moonIllumToStars(moonIllum).stars
    const moonPenalty = (5 - moonStars) * 0.5
    score -= moonPenalty
  }

  score = Math.max(0, Math.min(10, score))
  if (score >= 8) return { score, stars: 5, label: 'Excellent', color: 'text-green-400', reasons }
  if (score >= 6) return { score, stars: 4, label: 'Good', color: 'text-green-400', reasons }
  if (score >= 4) return { score, stars: 3, label: 'Fair', color: 'text-yellow-400', reasons }
  if (score >= 2) return { score, stars: 2, label: 'Poor', color: 'text-orange-400', reasons }
  return { score, stars: 1, label: 'Very Poor', color: 'text-red-400', reasons }
}

function ForecastRow({ day, isToday, moonIllum }: { day: any; isToday: boolean; moonIllum?: number }) {
  const { stars, label, color, reasons } = stargazingScore(day, moonIllum)
  const isGood = stars >= 4

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 border-b border-[hsl(215_15%_18%)] last:border-0 ${isToday ? 'bg-blue-500/5 -mx-3 px-3 rounded-lg my-1' : ''}`}>
      <div className="flex items-center gap-3 min-w-0">
        {isToday && <span className="shrink-0 text-xs font-medium text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded">Today</span>}
        <div className="min-w-0">
          <p className={`text-sm font-medium ${isToday ? 'text-white' : 'text-gray-300'}`}>
            {formatSwissDate(day.date)}
          </p>
          <p className="text-xs text-gray-500 truncate">{reasons.join(' · ')}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
        {isGood && <Sparkles className={`w-4 h-4 ${color} shrink-0`} />}
        <div className="flex items-center gap-0.5 shrink-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={`w-3.5 h-3.5 ${i < stars ? color : 'text-gray-700'}`} fill={i < stars ? 'currentColor' : 'none'} />
          ))}
        </div>
        <span className={`text-xs font-medium ${color} shrink-0 w-16 text-right`}>{label}</span>
        <div className="flex items-center gap-3 text-xs text-gray-500 shrink-0">
          <span>{Math.round(day.temp_min)}°/{Math.round(day.temp_max)}°</span>
          <span className="flex items-center gap-0.5"><Cloud className="w-3 h-3" />{day.cloud_cover}%</span>
          <span className="flex items-center gap-0.5"><Wind className="w-3 h-3" />{Math.round(day.wind_speed)}</span>
          {(day.dew_point || day.dewpoint_celsius) != null && (
            <span className="flex items-center gap-0.5"><Droplets className="w-3 h-3" />{Math.round(day.dew_point || day.dewpoint_celsius)}°</span>
          )}
        </div>
      </div>
    </div>
  )
}

function TargetCard({ target }: { target: any }) {
  const vis = target.visibility
  const alt = vis?.max_altitude || 0
  const qualityColor = alt > 60 ? 'text-green-400' : alt > 30 ? 'text-yellow-400' : 'text-gray-500'
  const wikiUrl = dsoWikiUrl(target.catalog_id)

  return (
    <div className="border border-[hsl(215_15%_18%)] rounded-xl p-4 hover:border-blue-500/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-mono text-blue-400 font-medium">{target.catalog_id}</p>
            {target.type && (
              <span className="text-xs px-1.5 py-0.5 bg-[hsl(220_15%_14%)] text-gray-500 rounded">{target.type}</span>
            )}
          </div>
          <p className="text-sm font-medium mt-0.5">{target.name || target.common_name}</p>
          {target.constellation && <p className="text-xs text-gray-500">{target.constellation}</p>}
        </div>
        <div className={`text-right shrink-0 ${qualityColor}`}>
          <p className="text-lg font-bold">{alt > 0 ? `${alt.toFixed(0)}°` : '—'}</p>
          <p className="text-xs opacity-60">altitude</p>
        </div>
      </div>

      {/* Description */}
      {target.description && (
        <p className="text-xs text-gray-500 mt-2 line-clamp-2">{target.description}</p>
      )}

      {/* Rise / Transit / Set */}
      {vis && (
        <div className="mt-3 pt-3 border-t border-[hsl(215_15%_14%)] grid grid-cols-3 gap-2 text-xs">
          {vis.rise_time && <div><span className="text-gray-500">Rise</span><p className="font-medium text-gray-300">{vis.rise_time}</p></div>}
          {vis.transit_time && <div><span className="text-gray-500">Transit</span><p className="font-medium text-gray-300">{vis.transit_time}</p></div>}
          {vis.set_time && <div><span className="text-gray-500">Set</span><p className="font-medium text-gray-300">{vis.set_time}</p></div>}
        </div>
      )}

      {/* Best window */}
      {vis?.best_window && (
        <p className="mt-2 text-xs text-green-400/80 flex items-center gap-1">
          <Eye className="w-3 h-3" /> Best: {vis.best_window}
        </p>
      )}

      {/* Metadata */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-[hsl(215_15%_14%)]">
        <div className="flex gap-3 text-xs text-gray-500">
          {target.magnitude != null && <span>Mag {target.magnitude}</span>}
          {target.size_arcmin != null && <span>{target.size_arcmin}'</span>}
        </div>
        <a
          href={wikiUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          Wikipedia <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}

export default function TonightSky() {
  const today = new Date().toISOString().split('T')[0]

  const { data: moon } = useQuery({ queryKey: ['moon', today], queryFn: () => getMoon(today) })
  const { data: forecast } = useQuery({ queryKey: ['forecast'], queryFn: getForecast })
  const { data: targets } = useQuery({ queryKey: ['best-tonight'], queryFn: () => getBestTonight(15) })
  const { data: currentWeather } = useQuery({ queryKey: ['weather'], queryFn: getWeather })

  const goodTargets = targets?.filter(t => (t.visibility?.max_altitude || 0) > 20) || []
  const moonIllum = moon?.illumination

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
        <Star className="w-6 h-6 text-blue-400" />
        Tonight's Sky
      </h1>
      <p className="text-gray-500 text-sm mb-6">
        {formatSwissDate(today)} · Aesch ZH
      </p>

      {/* Moon */}
      {moon && <MoonBadge illumination={moon.illumination} />}

      {/* Current conditions */}
      {currentWeather && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { icon: Thermometer, label: 'Temp', value: `${Math.round(currentWeather.temperature)}°C` },
            { icon: Cloud, label: 'Clouds', value: `${currentWeather.cloud_cover}%` },
            { icon: Wind, label: 'Wind', value: `${Math.round(currentWeather.wind_speed)} km/h` },
            { icon: Droplets, label: 'Dew Point', value: currentWeather.dew_point != null ? `${Math.round(currentWeather.dew_point)}°C` : '—' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-[hsl(220_15%_11%)] border border-[hsl(215_15%_18%)] rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <Icon className="w-3.5 h-3.5" /> {label}
              </div>
              <p className="font-semibold text-sm">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* 7-day forecast */}
      {forecast && forecast.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4" />
            7-Day Stargazing Forecast
          </h2>
          <div className="bg-[hsl(220_15%_10%)] border border-[hsl(215_15%_18%)] rounded-xl px-3 sm:px-4">
            {forecast.map(day => (
              <ForecastRow key={day.date} day={day} isToday={day.date === today} moonIllum={moonIllum} />
            ))}
          </div>
        </div>
      )}

      {/* Best targets */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-400" />
            Best Targets Tonight
          </h2>
          <span className="text-sm text-gray-500">{goodTargets.length} visible above 20°</span>
        </div>

        {goodTargets.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Moon className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>No targets with good visibility tonight.</p>
            <p className="text-sm mt-1">Check back tomorrow or look toward the weekend.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {goodTargets.map(target => (
            <TargetCard key={`${target.catalog_id}-${target.source_catalog}`} target={target} />
          ))}
        </div>
      </div>
    </div>
  )
}
