import { useQuery } from '@tanstack/react-query'
import { getBestTonight, getMoon, getForecast, getWeather } from '@/lib/api'
import { Moon, Cloud, Star, Eye, Wind, Thermometer, Droplets, Sparkles } from 'lucide-react'

function formatSwissDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}.${m}.${y}`
}

function moonIllumToStars(illumination: number): { stars: number; label: string; color: string } {
  if (illumination < 0.1) return { stars: 5, label: 'Perfect darkness', color: 'text-green-400' }
  if (illumination < 0.25) return { stars: 4, label: 'Dark moon', color: 'text-green-400' }
  if (illumination < 0.5) return { stars: 3, label: 'Moderate moonlight', color: 'text-yellow-400' }
  if (illumination < 0.75) return { stars: 2, label: 'Bright moon', color: 'text-orange-400' }
  return { stars: 1, label: 'Full moon — bright', color: 'text-red-400' }
}

function MoonBadge({ illumination }: { illumination: number }) {
  const { stars, label, color } = moonIllumToStars(illumination)
  const emoji = illumination < 0.1 ? '🌑' : illumination < 0.25 ? '🌒' : illumination < 0.45 ? '🌓' : illumination < 0.55 ? '🌕' : illumination < 0.75 ? '🌖' : '🌗'
  return (
    <div className="flex items-center gap-3 bg-[hsl(220_15%_11%)] border border-[hsl(215_15%_18%)] rounded-xl px-4 py-3">
      <span className="text-2xl">{emoji}</span>
      <div>
        <p className="text-sm font-medium">{Math.round(illumination * 100)}% illuminated</p>
        <div className="flex items-center gap-1 mt-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-3 h-3 ${i < stars ? color : 'text-gray-700'}`}
              fill={i < stars ? 'currentColor' : 'none'}
            />
          ))}
          <span className={`text-xs ml-1 ${color}`}>{label}</span>
        </div>
      </div>
    </div>
  )
}

function stargazingScore(day: any): { score: number; stars: number; label: string; color: string } {
  let score = 10
  const reasons: string[] = []

  const cloudCover = day.cloud_cover || 100
  if (cloudCover < 20) { score += 3; reasons.push('Clear') }
  else if (cloudCover < 50) { score += 1; reasons.push('Patchy clouds') }
  else if (cloudCover < 80) { score -= 3; reasons.push('Cloudy') }
  else { score -= 6; reasons.push('Overcast') }

  const wind = day.wind_speed || 0
  if (wind > 30) { score -= 2; reasons.push('Windy') }
  else if (wind < 15) score += 1

  const temp = (day.temp_min + day.temp_max) / 2
  if (temp < 0) { score -= 1; reasons.push('Freezing') }
  else if (temp > 5 && temp < 20) { score += 1; reasons.push('Mild') }

  score = Math.max(0, Math.min(10, score))

  if (score >= 8) return { score, stars: 5, label: 'Excellent', color: 'text-green-400' }
  if (score >= 6) return { score, stars: 4, label: 'Good', color: 'text-green-400' }
  if (score >= 4) return { score, stars: 3, label: 'Fair', color: 'text-yellow-400' }
  if (score >= 2) return { score, stars: 2, label: 'Poor', color: 'text-orange-400' }
  return { score, stars: 1, label: 'Very Poor', color: 'text-red-400' }
}

function ForecastRow({ day, isToday }: { day: any; isToday: boolean }) {
  const { stars, label, color } = stargazingScore(day)
  const isGood = stars >= 4

  return (
    <div className={`flex items-center justify-between py-3 border-b border-[hsl(215_15%_18%)] last:border-0 ${isToday ? 'bg-blue-500/5 -mx-3 px-3 rounded-lg' : ''}`}>
      <div className="flex items-center gap-3">
        {isToday && (
          <span className="text-xs font-medium text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded">Today</span>
        )}
        <div>
          <p className={`text-sm font-medium ${isToday ? 'text-white' : 'text-gray-300'}`}>
            {formatSwissDate(day.date)}
          </p>
          <p className="text-xs text-gray-500">{day.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {isGood && <Sparkles className={`w-4 h-4 ${color}`} />}
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-3.5 h-3.5 ${i < stars ? color : 'text-gray-700'}`}
            fill={i < stars ? 'currentColor' : 'none'}
          />
        ))}
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-500 min-w-[140px] justify-end">
        <span className="text-gray-400">{Math.round(day.temp_min)}° / {Math.round(day.temp_max)}°</span>
        <span className="flex items-center gap-0.5"><Cloud className="w-3 h-3" />{day.cloud_cover}%</span>
        <span className="flex items-center gap-0.5"><Wind className="w-3 h-3" />{Math.round(day.wind_speed)}</span>
      </div>
    </div>
  )
}

function TargetCard({ target }: { target: any }) {
  const vis = target.visibility
  const alt = vis?.max_altitude || 0
  const qualityColor = alt > 60 ? 'text-green-400' : alt > 30 ? 'text-yellow-400' : 'text-gray-500'

  return (
    <div className="border border-[hsl(215_15%_18%)] rounded-xl p-4 hover:border-blue-500/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-blue-400 font-medium">{target.catalog_id}</p>
          <p className="text-sm font-medium">{target.name}</p>
          {target.constellation && <p className="text-xs text-gray-500">{target.constellation}</p>}
          {target.magnitude != null && <p className="text-xs text-gray-600 mt-0.5">Mag {target.magnitude}</p>}
        </div>
        <div className={`text-right ${qualityColor}`}>
          <p className="text-lg font-bold">{alt > 0 ? `${alt.toFixed(0)}°` : '—'}</p>
          <p className="text-xs">altitude</p>
        </div>
      </div>
      {vis && (
        <div className="mt-3 pt-3 border-t border-[hsl(215_15%_14%)] grid grid-cols-3 gap-2 text-xs">
          {vis.rise_time && <div><span className="text-gray-500">Rise</span><p className="font-medium text-gray-300">{vis.rise_time}</p></div>}
          {vis.transit_time && <div><span className="text-gray-500">Transit</span><p className="font-medium text-gray-300">{vis.transit_time}</p></div>}
          {vis.set_time && <div><span className="text-gray-500">Set</span><p className="font-medium text-gray-300">{vis.set_time}</p></div>}
        </div>
      )}
      {vis?.best_window && (
        <p className="mt-2 text-xs text-green-400/80 flex items-center gap-1">
          <Eye className="w-3 h-3" /> Best: {vis.best_window}
        </p>
      )}
    </div>
  )
}

export default function TonightSky() {
  const today = new Date().toISOString().split('T')[0]
  const todaySwiss = formatSwissDate(today)

  const { data: moon } = useQuery({
    queryKey: ['moon', today],
    queryFn: () => getMoon(today),
  })
  const { data: forecast } = useQuery({
    queryKey: ['forecast'],
    queryFn: getForecast,
  })
  const { data: targets } = useQuery({
    queryKey: ['best-tonight'],
    queryFn: () => getBestTonight(15),
  })
  const { data: currentWeather } = useQuery({
    queryKey: ['weather'],
    queryFn: getWeather,
  })

  const goodTargets = targets?.filter(t => (t.visibility?.max_altitude || 0) > 20) || []
  const todayForecast = forecast?.find(d => d.date === today) || forecast?.[0]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
        <Star className="w-6 h-6 text-blue-400" />
        Tonight's Sky
      </h1>
      <p className="text-gray-500 text-sm mb-6">{todaySwiss} · Aesch ZH</p>

      {/* Moon */}
      {moon && <MoonBadge illumination={moon.illumination} />}

      {/* Current weather */}
      {currentWeather && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Thermometer, label: 'Temp', value: `${Math.round(currentWeather.temperature)}°C` },
            { icon: Cloud, label: 'Clouds', value: `${currentWeather.cloud_cover}%` },
            { icon: Wind, label: 'Wind', value: `${Math.round(currentWeather.wind_speed)} km/h` },
            { icon: Droplets, label: 'Humidity', value: `${currentWeather.humidity}%` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-[hsl(220_15%_11%)] border border-[hsl(215_15%_18%)] rounded-xl px-4 py-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                <Icon className="w-3.5 h-3.5" /> {label}
              </div>
              <p className="font-semibold">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* 7-day forecast */}
      {forecast && forecast.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4" /> 7-Day Stargazing Forecast
          </h2>
          <div className="bg-[hsl(220_15%_10%)] border border-[hsl(215_15%_18%)] rounded-xl px-4">
            {forecast.map(day => (
              <ForecastRow key={day.date} day={day} isToday={day.date === today} />
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
          <span className="text-sm text-gray-500">
            {goodTargets.length} visible above 20°
          </span>
        </div>

        {goodTargets.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Moon className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>No targets with good visibility tonight.</p>
            <p className="text-sm mt-1">Check back tomorrow or look toward the weekend.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {goodTargets.map(target => (
            <TargetCard key={`${target.catalog_id}-${target.source_catalog}`} target={target} />
          ))}
        </div>
      </div>
    </div>
  )
}
