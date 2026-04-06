import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useToast } from '@/components/Toast'
import { createSkyCheck, getMoon, getWeather } from '@/lib/api'
import {
  Cloud, Eye, Thermometer, Droplets, Wind, Moon, Info,
  MapPin, Clock, Save, Loader2, ChevronRight, Check, RefreshCw
} from 'lucide-react'

interface SkyCheckForm {
  date: string
  time: string
  location: string
  cloud_cover: number | null
  transparency: number | null
  seeing: number | null
  temperature: number | null
  humidity: number | null
  wind_speed: number | null
  moon_phase: string | null
  moon_visible: boolean | null
  notes: string
}

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative inline-block">
      <Info 
        className="w-3.5 h-3.5 text-gray-600 hover:text-gray-400 cursor-help ml-1" 
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      />
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[hsl(220_15%_14%)] border border-[hsl(215_15%_22%)] rounded-lg text-xs text-gray-400 w-48 z-50 shadow-xl">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[hsl(215_15%_22%)]" />
        </div>
      )}
    </div>
  )
}

function StarRating({ 
  label, 
  value, 
  onChange, 
  tooltip 
}: { 
  label: string
  value: number | null
  onChange: (v: number | null) => void
  tooltip?: string
}) {
  const labels = ['', 'Poor', 'Below Avg', 'Average', 'Good', 'Excellent']
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <span className="text-sm text-gray-400">{label}</span>
        {tooltip && <Tooltip text={tooltip} />}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(value === n ? null : n)}
              className={`w-6 h-6 rounded transition-all hover:scale-110 ${
                n <= (value || 0) ? 'text-yellow-400' : 'text-gray-700 hover:text-gray-500'
              }`}
            >
              ★
            </button>
          ))}
        </div>
        {value && <span className="text-xs text-gray-500 w-16">{labels[value]}</span>}
      </div>
    </div>
  )
}

function SliderInput({
  label,
  value,
  onChange,
  min,
  max,
  unit,
  icon: Icon,
  currentValue,
  onUseCurrent,
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  min: number
  max: number
  unit: string
  icon: React.ElementType
  currentValue?: number | null
  onUseCurrent?: () => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 text-sm text-gray-400">
          <Icon className="w-4 h-4" />
          {label}
        </div>
        <div className="flex items-center gap-2">
          {currentValue != null && value !== currentValue && onUseCurrent && (
            <button
              type="button"
              onClick={onUseCurrent}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Use {currentValue}{unit}
            </button>
          )}
          <span className="text-sm font-mono text-blue-400 min-w-[3rem] text-right">
            {value != null ? `${value}${unit}` : '—'}
          </span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value ?? min}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
      <div className="flex justify-between text-xs text-gray-600 mt-0.5">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}

export default function SkyCheck() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const now = new Date()
  const initialForm: SkyCheckForm = {
    date: format(now, 'yyyy-MM-dd'),
    time: format(now, 'HH:mm'),
    location: 'Aesch ZH',
    cloud_cover: 0,
    transparency: null,
    seeing: null,
    temperature: null,
    humidity: null,
    wind_speed: null,
    moon_phase: null,
    moon_visible: null,
    notes: '',
  }

  const [form, setForm] = useState<SkyCheckForm>(initialForm)
  const [justSaved, setJustSaved] = useState(false)

  // Fetch weather data on mount
  const { data: weatherData } = useQuery({
    queryKey: ['weather'],
    queryFn: getWeather,
    staleTime: 5 * 60 * 1000,
  })

  // Fetch moon phase
  const { data: moonData } = useQuery({
    queryKey: ['moon', form.date],
    queryFn: () => getMoon(form.date),
    staleTime: 60 * 60 * 1000,
  })

  // Auto-fill from weather when available (only on first load)
  useEffect(() => {
    if (weatherData && form.temperature === null) {
      setForm(f => ({
        ...f,
        temperature: weatherData.temperature ?? f.temperature,
        humidity: weatherData.humidity ?? f.humidity,
        wind_speed: weatherData.wind_speed ?? f.wind_speed,
      }))
    }
  }, [weatherData])

  // Auto-fill moon phase
  useEffect(() => {
    if (moonData) {
      setForm(f => ({
        ...f,
        moon_phase: moonData.phase_name,
      }))
    }
  }, [moonData])

  const saveMutation = useMutation({
    mutationFn: (data: SkyCheckForm) => createSkyCheck({
      ...data,
      moon_visible: data.moon_visible,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sky-checks'] })
      showToast('Sky check saved', 'success')
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2000)
    },
    onError: () => {
      showToast('Failed to save sky check', 'error')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate(form)
  }

  const setField = <K extends keyof SkyCheckForm>(key: K, value: SkyCheckForm[K]) => {
    setForm(f => ({ ...f, [key]: value }))
  }

  // Format date in Swiss format (DD.MM.YYYY)
  const swissDate = form.date ? format(new Date(form.date), 'dd.MM.yyyy') : ''

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Sky Check</h1>
          <p className="text-sm text-gray-500 mt-1">Quick conditions check</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-[hsl(220_15%_10%)] px-3 py-1.5 rounded-lg border border-[hsl(215_15%_18%)]">
          <Clock className="w-4 h-4" />
          {swissDate} {form.time}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Location */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium mb-1">
            <MapPin className="w-4 h-4 text-gray-500" />
            Location
          </label>
          <input
            type="text"
            value={form.location}
            onChange={e => setField('location', e.target.value)}
            placeholder="Aesch ZH"
            className="w-full bg-[hsl(220_15%_11%)] border border-[hsl(215_15%_22%)] rounded-lg px-3 py-2 text-sm focus:border-blue-500/50 focus:outline-none transition-colors"
          />
        </div>

        {/* Cloud Cover - now starts at 0 */}
        <SliderInput
          label="Cloud Cover"
          value={form.cloud_cover}
          onChange={v => setField('cloud_cover', v)}
          min={0}
          max={100}
          unit="%"
          icon={Cloud}
        />

        {/* Transparency & Seeing with tooltips */}
        <div className="bg-[hsl(220_15%_10%)] rounded-lg p-4 border border-[hsl(215_15%_18%)] space-y-3">
          <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-2">
            <Eye className="w-4 h-4" />
            Sky Quality Ratings
          </div>
          <StarRating
            label="Transparency"
            value={form.transparency}
            onChange={v => setField('transparency', v)}
            tooltip="How clear is the atmosphere? Affected by haze, dust, humidity. 5 = crystal clear, 1 = very hazy."
          />
          <StarRating
            label="Seeing"
            value={form.seeing}
            onChange={v => setField('seeing', v)}
            tooltip="How stable is the atmosphere? Affects star twinkling and fine detail. 5 = rock steady, 1 = lots of twinkling."
          />
        </div>

        {/* Weather - with current values displayed */}
        <div className="bg-[hsl(220_15%_10%)] rounded-lg p-4 border border-[hsl(215_15%_18%)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">Weather</div>
            {weatherData && (
              <div className="text-xs text-gray-500">
                Current: {weatherData.temperature}°C, {weatherData.wind_speed} km/h
              </div>
            )}
          </div>
          
          <SliderInput
            label="Temperature"
            value={form.temperature}
            onChange={v => setField('temperature', v)}
            min={-20}
            max={40}
            unit="°C"
            icon={Thermometer}
            currentValue={weatherData?.temperature}
            onUseCurrent={() => setField('temperature', weatherData?.temperature)}
          />

          <SliderInput
            label="Humidity"
            value={form.humidity}
            onChange={v => setField('humidity', v)}
            min={0}
            max={100}
            unit="%"
            icon={Droplets}
            currentValue={weatherData?.humidity}
            onUseCurrent={() => setField('humidity', weatherData?.humidity)}
          />

          <SliderInput
            label="Wind Speed"
            value={form.wind_speed}
            onChange={v => setField('wind_speed', v)}
            min={0}
            max={100}
            unit=" km/h"
            icon={Wind}
            currentValue={weatherData?.wind_speed}
            onUseCurrent={() => setField('wind_speed', weatherData?.wind_speed)}
          />
        </div>

        {/* Moon */}
        <div className="bg-[hsl(220_15%_10%)] rounded-lg p-4 border border-[hsl(215_15%_18%)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className={`w-5 h-5 ${form.moon_phase ? 'text-blue-400' : 'text-gray-600'}`} />
              <div>
                <div className="text-sm text-gray-400">Moon</div>
                {form.moon_phase && (
                  <div className="text-xs text-gray-500">{form.moon_phase}</div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setField('moon_visible', true)}
                className={`px-3 py-1 rounded-full text-xs transition-all ${
                  form.moon_visible === true
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                    : 'bg-[hsl(220_15%_14%)] text-gray-500 hover:text-gray-300 border border-transparent'
                }`}
              >
                Visible
              </button>
              <button
                type="button"
                onClick={() => setField('moon_visible', false)}
                className={`px-3 py-1 rounded-full text-xs transition-all ${
                  form.moon_visible === false
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                    : 'bg-[hsl(220_15%_14%)] text-gray-500 hover:text-gray-300 border border-transparent'
                }`}
              >
                Not Visible
              </button>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-sm font-medium mb-1 block">Notes</label>
          <textarea
            value={form.notes}
            onChange={e => setField('notes', e.target.value)}
            placeholder="Any other observations? Light pollution? Bortle class?"
            rows={3}
            className="w-full bg-[hsl(220_15%_11%)] border border-[hsl(215_15%_22%)] rounded-lg px-3 py-2 text-sm focus:border-blue-500/50 focus:outline-none transition-colors resize-none"
          />
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              justSaved
                ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30'
            }`}
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : justSaved ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {justSaved ? 'Saved!' : 'Save Check'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/sky-checks')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            View History
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  )
}
