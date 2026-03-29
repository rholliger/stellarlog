import { useQuery } from '@tanstack/react-query'
import { getBestTonight, getMoon, getForecast, getWeather } from '@/lib/api'
import { Moon, Cloud, Star, TrendingUp, Eye, Wind } from 'lucide-react'

function MoonBadge({ illumination }: { illumination: number }) {
  const emoji = illumination < 0.1 ? '🌑' : illumination < 0.25 ? '🌒' : illumination < 0.45 ? '🌓' : illumination < 0.55 ? '🌕' : illumination < 0.75 ? '🌖' : '🌗'
  const quality = illumination < 0.25 ? 'dark' : illumination < 0.5 ? 'good' : 'bright'
  return (
    <div className="flex items-center gap-3 bg-muted rounded-xl px-4 py-3">
      <span className="text-2xl">{emoji}</span>
      <div>
        <p className="text-sm font-medium">{Math.round(illumination * 100)}% illuminated</p>
        <p className="text-xs text-muted-foreground capitalize">{quality} — {quality === 'dark' ? 'ideal for DSOs' : illumination < 0.5 ? 'good conditions' : 'bright moon limits faint objects'}</p>
      </div>
    </div>
  )
}

function ForecastRow({ day }: { day: any }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium w-24">{day.date}</span>
        <span className="text-xs text-muted-foreground">{day.description}</span>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>{Math.round(day.temp_min)}° / {Math.round(day.temp_max)}°</span>
        <span className="flex items-center gap-1"><Cloud className="w-3 h-3" />{day.cloud_cover}%</span>
        <span className="flex items-center gap-1"><Wind className="w-3 h-3" />{day.wind_speed}km/h</span>
      </div>
    </div>
  )
}

function TargetCard({ target }: { target: any }) {
  const vis = target.visibility
  const alt = vis?.max_altitude || 0
  const quality = alt > 60 ? 'text-green-400' : alt > 30 ? 'text-yellow-400' : 'text-muted-foreground'

  return (
    <div className="border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-primary font-medium">{target.catalog_id}</p>
          <p className="text-sm font-medium">{target.name}</p>
          {target.constellation && <p className="text-xs text-muted-foreground">{target.constellation}</p>}
        </div>
        <div className={`text-right ${quality}`}>
          <p className="text-lg font-bold">{alt > 0 ? `${alt.toFixed(0)}°` : '—'}</p>
          <p className="text-xs">altitude</p>
        </div>
      </div>
      {vis && (
        <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          {vis.rise_time && <div><span className="text-xs">Rise</span><p className="font-medium">{vis.rise_time}</p></div>}
          {vis.transit_time && <div><span className="text-xs">Transit</span><p className="font-medium">{vis.transit_time}</p></div>}
          {vis.set_time && <div><span className="text-xs">Set</span><p className="font-medium">{vis.set_time}</p></div>}
        </div>
      )}
      {vis?.best_window && (
        <p className="mt-2 text-xs text-green-400/80 flex items-center gap-1">
          <Eye className="w-3 h-3" /> Best: {vis.best_window}
        </p>
      )}
      {target.magnitude != null && (
        <p className="mt-2 text-xs text-muted-foreground">Mag {target.magnitude}</p>
      )}
    </div>
  )
}

export default function TonightSky() {
  const today = new Date().toISOString().split('T')[0]

  const { data: moon, isLoading: moonLoading } = useQuery({
    queryKey: ['moon', today],
    queryFn: () => getMoon(today),
  })
  const { data: forecast } = useQuery({
    queryKey: ['forecast'],
    queryFn: getForecast,
  })
  const { data: targets, isLoading: targetsLoading } = useQuery({
    queryKey: ['best-tonight'],
    queryFn: () => getBestTonight(15),
  })
  const { data: currentWeather } = useQuery({
    queryKey: ['weather'],
    queryFn: getWeather,
  })

  const goodTargets = targets?.filter(t => (t.visibility?.max_altitude || 0) > 20) || []

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Star className="w-6 h-6 text-primary" />
        Tonight's Sky — Aesch ZH
      </h1>

      {/* Moon */}
      {moon && <MoonBadge illumination={moon.illumination} />}

      {/* Weather now */}
      {currentWeather && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Cloud, label: 'Clouds', value: `${currentWeather.cloud_cover}%` },
            { icon: Wind, label: 'Wind', value: `${currentWeather.wind_speed} km/h` },
            { icon: TrendingUp, label: 'Temp', value: `${currentWeather.temperature}°C` },
            { icon: Eye, label: 'Humidity', value: `${currentWeather.humidity}%` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-muted rounded-xl px-4 py-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
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
          <h2 className="text-sm font-medium text-muted-foreground mb-2">7-Day Forecast</h2>
          <div className="bg-muted/50 rounded-xl px-4">
            {forecast.map(day => <ForecastRow key={day.date} day={day} />)}
          </div>
        </div>
      )}

      {/* Best targets */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            Best Targets Tonight
          </h2>
          <span className="text-sm text-muted-foreground">
            {goodTargets.length} visible above 20°
          </span>
        </div>

        {targetsLoading && <p className="text-muted-foreground">Loading targets...</p>}

        {goodTargets.length === 0 && !targetsLoading && (
          <div className="text-center py-12 text-muted-foreground">
            <Moon className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No targets with good visibility tonight.</p>
            <p className="text-sm">Check back tomorrow or look toward the weekend.</p>
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
