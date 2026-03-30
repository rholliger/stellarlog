import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getBestTonight, getTonightAstronomy, getForecast, getWeather } from '@/lib/api'
import { useLiveSky } from '@/hooks/useLiveSky'
import { Moon, Cloud, Star, Eye, Wind, Thermometer, Droplets, Sparkles, ExternalLink, Clock } from 'lucide-react'
import { VisibilityBar } from '@/components/VisibilityBar'
import { EmptyState } from '@/components/EmptyState'
import { TargetCardSkeleton } from '@/components/Skeleton'

function formatSwissDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}.${m}.${y}`
}

function dsoWikiUrl(catalogId: string): string {
  const clean = catalogId.trim()
  const caldwellMatch = clean.match(/^C\s*(\d+)$/i)
  if (caldwellMatch) {
    return `https://en.wikipedia.org/wiki/Caldwell_${encodeURIComponent(caldwellMatch[1])}`
  }
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(clean.replace(/\s+/g, '_'))}`
}

function moonIllumToEmoji(illumination: number): string {
  if (illumination < 0.1) return '🌑'
  if (illumination < 0.25) return '🌒'
  if (illumination < 0.45) return '🌓'
  if (illumination < 0.55) return '🌕'
  if (illumination < 0.75) return '🌖'
  return '🌗'
}

interface StargazingScore {
  score: number
  stars: number
  label: string
  color: string
  reasons: string[]
  verdict: string
}

function StargazingRating({ score, size = 'md' }: { score: StargazingScore; size?: 'sm' | 'md' | 'lg' }) {
  const starSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }
  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }
  
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`${starSizes[size]} ${i < score.stars ? score.color : 'text-gray-700'}`}
            fill={i < score.stars ? 'currentColor' : 'none'}
          />
        ))}
      </div>
      <span className={`${textSizes[size]} font-medium ${score.color}`}>{score.verdict}</span>
    </div>
  )
}

function LiveClock() {
  const { currentTime, isNight } = useLiveSky()
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-400">
      <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      <span>{currentTime}</span>
      <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isNight ? 'bg-blue-400' : 'bg-yellow-400'}`} />
      <span className="hidden sm:inline text-xs">{isNight ? 'Night' : 'Day'}</span>
    </div>
  )
}

function ForecastRow({ 
  day, 
  isToday, 
  score
}: { 
  day: any
  isToday: boolean
  score: StargazingScore
}) {

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2.5 sm:py-3 border-b border-[hsl(215_15%_18%)] last:border-0 ${isToday ? 'bg-blue-500/5 -mx-2 sm:-mx-3 px-2 sm:px-3 rounded-lg my-1' : ''}`}>
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {isToday && (
          <span className="shrink-0 text-xs font-medium text-blue-400 bg-blue-500/15 px-1.5 sm:px-2 py-0.5 rounded">
            Today
          </span>
        )}
        <div className="min-w-0">
          <p className={`text-sm font-medium ${isToday ? 'text-white' : 'text-gray-300'}`}>
            {formatSwissDate(day.date)}
          </p>
          <p className="text-xs text-gray-500 truncate">{score.reasons.join(' · ')}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
        {score.score >= 7 && <Sparkles className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${score.color} shrink-0`} />}
        
        <StargazingRating score={score} size="sm" />
        
        <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-500 shrink-0">
          <span>{Math.round(day.temp_min)}°/{Math.round(day.temp_max)}°</span>
          <span className="flex items-center gap-0.5">
            <Cloud className="w-3 h-3" />
            {day.cloud_cover}%
          </span>
          <span className="hidden sm:flex items-center gap-0.5">
            <Wind className="w-3 h-3" />
            {Math.round(day.wind_speed)}
          </span>
          {day.dew_point != null && (
            <span className="hidden sm:flex items-center gap-0.5">
              <Droplets className="w-3 h-3" />
              {Math.round(day.dew_point)}°
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function TargetCard({ target, currentTime }: { target: any; currentTime?: string }) {
  const vis = target.visibility
  const alt = vis?.max_altitude || 0
  const qualityColor = alt > 60 ? 'text-green-400' : alt > 30 ? 'text-yellow-400' : 'text-gray-500'
  const wikiUrl = dsoWikiUrl(target.catalog_id)
  const isCurrentlyVisible = vis?.is_visible && alt > 20

  return (
    <div className="group border border-[hsl(215_15%_18%)] rounded-xl p-3 sm:p-4 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5 active:scale-[0.99] transition-all duration-200 bg-[hsl(220_15%_8%)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <p className="font-mono text-blue-400 font-medium text-sm sm:text-base">{target.catalog_id}</p>
            {isCurrentlyVisible && (
              <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded-full border border-green-500/30 shrink-0">
                Visible
              </span>
            )}
            {target.type && (
              <span className="hidden sm:inline text-xs px-1.5 py-0.5 bg-[hsl(220_15%_14%)] text-gray-500 rounded">
                {target.type}
              </span>
            )}
          </div>
          <p className="text-sm font-medium mt-0.5 truncate">{target.name || target.common_name}</p>
          {target.constellation && <p className="text-xs text-gray-500">{target.constellation}</p>}
        </div>
        <div className={`text-right shrink-0 ${qualityColor}`}>
          <p className="text-base sm:text-lg font-bold">{alt > 0 ? `${alt.toFixed(0)}°` : '—'}</p>
          <p className="text-xs opacity-60">max alt</p>
        </div>
      </div>

      {target.description && (
        <p className="text-xs text-gray-500 mt-1.5 sm:mt-2 line-clamp-2">{target.description}</p>
      )}

      {/* Visual visibility timeline */}
      {vis && vis.max_altitude > 0 ? (
        <div className="mt-2 sm:mt-3">
          {vis.rise_time && vis.set_time ? (
            <VisibilityBar
              riseTime={vis.rise_time}
              setTime={vis.set_time}
              transitTime={vis.transit_time}
              currentTime={currentTime}
            />
          ) : vis.max_altitude > 20 ? (
            <p className="text-xs text-green-400/80">Circumpolar - visible all night</p>
          ) : (
            <p className="text-xs text-gray-600 italic">Low altitude tonight</p>
          )}
        </div>
      ) : (
        <p className="mt-2 text-xs text-gray-600 italic">Below horizon tonight</p>
      )}

      {/* Quick actions */}
      <div className="flex items-center justify-between mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-[hsl(215_15%_14%)]">
        <div className="flex gap-2 sm:gap-3 text-xs text-gray-500">
          {target.magnitude != null && <span>Mag {target.magnitude}</span>}
          {target.size_arcmin != null && <span>{target.size_arcmin}'</span>}
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/new?target=${encodeURIComponent(target.catalog_id)}&name=${encodeURIComponent(target.name || target.common_name || '')}`}
            className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30 hover:bg-blue-500/30 transition-colors sm:opacity-0 sm:group-hover:opacity-100"
          >
            Log
          </Link>
          <a
            href={wikiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-400 transition-colors p-1"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  )
}

export default function TonightSky() {
  const today = new Date().toISOString().split('T')[0]
  const { currentTime } = useLiveSky()

  // Get comprehensive tonight data (moon + weather + score)
  const { data: tonightData, isLoading: tonightLoading } = useQuery({
    queryKey: ['tonight'],
    queryFn: getTonightAstronomy,
  })

  const { data: forecast, isLoading: forecastLoading } = useQuery({
    queryKey: ['forecast'],
    queryFn: getForecast,
  })

  const { data: targets, isLoading: targetsLoading } = useQuery({
    queryKey: ['best-tonight'],
    queryFn: () => getBestTonight(12),
  })

  const { data: currentWeather } = useQuery({
    queryKey: ['weather'],
    queryFn: getWeather,
  })

  // Calculate forecast scores - use default moon if data not loaded yet
  const getForecastScore = (day: any): StargazingScore => {
    // Use moon data if available, otherwise assume average moon (50%)
    const moonIllum = tonightData?.moon?.illumination ?? 0.5
    
    let score = 10
    const reasons: string[] = []

    const cloudCover = day.cloud_cover || 100
    if (cloudCover < 10) { score += 3; reasons.push('Crystal clear') }
    else if (cloudCover < 25) { score += 2; reasons.push('Clear') }
    else if (cloudCover < 50) { score += 0; reasons.push('Patchy') }
    else if (cloudCover < 75) { score -= 3; reasons.push('Cloudy') }
    else { score -= 6; reasons.push('Overcast') }

    const wind = day.wind_speed || 0
    if (wind > 40) { score -= 3; reasons.push('Very windy') }
    else if (wind > 25) { score -= 1; reasons.push('Breezy') }
    else if (wind < 10) { score += 1; reasons.push('Calm') }

    const humidity = day.humidity || 50
    if (humidity > 90) { score -= 2; reasons.push('Poor transparency') }
    else if (humidity > 75) { score -= 1; reasons.push('Hazy') }
    else if (humidity < 40) { score += 1; reasons.push('Clear air') }

    // Moon penalty for forecast (use actual or default)
    if (!tonightData?.moon) {
      reasons.push('Moon TBD')
      // No score change when moon unknown
    } else if (moonIllum < 0.1) { 
      score += 2; reasons.push('New moon') 
    } else if (moonIllum < 0.25) { 
      score += 1; reasons.push('Dark moon') 
    } else if (moonIllum < 0.5) { 
      score -= 1; reasons.push('Moon lit') 
    } else if (moonIllum < 0.75) { 
      score -= 2; reasons.push('Bright moon') 
    } else { 
      score -= 3; reasons.push('Full moon') 
    }

    score = Math.max(0, Math.min(10, score))
    const stars = Math.max(1, Math.min(5, Math.round(score / 2)))
    
    return {
      score,
      stars,
      label: score >= 9 ? 'Excellent' : score >= 7 ? 'Good' : score >= 5 ? 'Fair' : score >= 3 ? 'Poor' : 'Very Poor',
      color: score >= 7 ? 'text-green-400' : score >= 5 ? 'text-yellow-400' : score >= 3 ? 'text-orange-400' : 'text-red-400',
      reasons,
      verdict: score >= 9 ? 'Excellent' : score >= 7 ? 'Good' : score >= 5 ? 'Fair' : score >= 3 ? 'Poor' : 'Very Poor',
    }
  }

  const tonightScore = tonightData?.stargazing_score
  const moon = tonightData?.moon

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold mb-0.5 sm:mb-1 flex items-center gap-2">
            <Star className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
            Tonight's Sky
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm">
            {formatSwissDate(today)} · Aesch ZH
          </p>
        </div>
        <LiveClock />
      </div>

      {/* Tonight's stargazing conditions */}
      {tonightLoading ? (
        <div className="h-[80px] sm:h-[100px] bg-[hsl(220_15%_11%)] rounded-xl animate-pulse" />
      ) : tonightScore ? (
        <div className="bg-[hsl(220_15%_11%)] border border-[hsl(215_15%_18%)] rounded-xl p-3 sm:p-4 hover:border-[hsl(215_15%_25%)] transition-colors">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-2xl sm:text-3xl">{moon ? moonIllumToEmoji(moon.illumination) : '🌑'}</span>
              <div>
                <p className="text-sm sm:text-base font-medium text-gray-200">
                  {moon ? `${Math.round(moon.illumination * 100)}% illuminated` : 'Moon data unavailable'}
                </p>
                <div className="mt-1">
                  <StargazingRating score={tonightScore} size="md" />
                </div>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs text-gray-500">Conditions</p>
              <p className="text-xs text-gray-400 max-w-[150px]">{tonightScore.reasons.slice(0, 3).join(' · ')}</p>
            </div>
          </div>
          {tonightScore.reasons.length > 0 && (
            <p className="mt-2 text-xs text-gray-500 sm:hidden">
              {tonightScore.reasons.slice(0, 3).join(' · ')}
            </p>
          )}
        </div>
      ) : null}

      {/* Current conditions */}
      {currentWeather && (
        <div className="mt-3 sm:mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { icon: Thermometer, label: 'Temp', value: `${Math.round(currentWeather.temperature)}°C` },
            { icon: Cloud, label: 'Clouds', value: `${currentWeather.cloud_cover}%` },
            { icon: Wind, label: 'Wind', value: `${Math.round(currentWeather.wind_speed)} km/h` },
            { 
              icon: Droplets, 
              label: 'Dew', 
              value: currentWeather.dew_point != null ? `${Math.round(currentWeather.dew_point)}°C` : 'N/A',
              tooltip: currentWeather.dew_point != null ? 'Dew point temperature' : 'Data not available'
            },
          ].map(({ icon: Icon, label, value, tooltip }) => (
            <div 
              key={label} 
              className="bg-[hsl(220_15%_11%)] border border-[hsl(215_15%_18%)] rounded-xl px-2.5 sm:px-3 py-2 sm:py-2.5 hover:border-[hsl(215_15%_25%)] transition-colors"
              title={tooltip}
            >
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-0.5 sm:mb-1">
                <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </div>
              <p className="font-semibold text-sm">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* 5-day forecast */}
      {forecastLoading ? (
        <div className="mt-4 sm:mt-6 h-[150px] sm:h-[200px] bg-[hsl(220_15%_10%)] rounded-xl animate-pulse" />
      ) : forecast && forecast.length > 0 ? (
        <div className="mt-4 sm:mt-6">
          <h2 className="text-xs sm:text-sm font-medium text-gray-400 mb-2 sm:mb-3 flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            5-Day Stargazing Forecast
          </h2>
          <div className="bg-[hsl(220_15%_10%)] border border-[hsl(215_15%_18%)] rounded-xl px-2 sm:px-4 hover:border-[hsl(215_15%_22%)] transition-colors">
            {forecast.map(day => (
              <ForecastRow 
                key={day.date} 
                day={day} 
                isToday={day.date === today}
                score={getForecastScore(day)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* Best targets */}
      <div className="mt-6 sm:mt-8">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
            Best Targets Tonight
          </h2>
          <span className="text-xs sm:text-sm text-gray-500">
            {targets?.length || 0} visible
          </span>
        </div>

        {targetsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
            {[...Array(4)].map((_, i) => (
              <TargetCardSkeleton key={i} />
            ))}
          </div>
        ) : targets && targets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
            {targets.map(target => (
              <TargetCard 
                key={`${target.catalog_id}-${target.source_catalog}`} 
                target={target} 
                currentTime={currentTime} 
              />
            ))}
          </div>
        ) : (
          <EmptyState type="targets" />
        )}
      </div>
    </div>
  )
}
