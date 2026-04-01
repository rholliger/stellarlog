import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useToast } from '@/components/Toast'
import { createSkyCheck, getMoon, getWeather } from '@/lib/api'
import {
  Cloud, Eye, Thermometer, Droplets, Wind, Moon,
  MapPin, Clock, Save, Loader2, ChevronRight, Check
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

function StarRating({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  const labels = ['', 'Poor', 'Below Avg', 'Average', 'Good', 'Excellent']
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-400">{label}</span>
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
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  min: number
  max: number
  unit: string
  icon: React.ElementType
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 text-sm text-gray-400">
          <Icon className="w-4 h-4" />
          {label}
        </div>
        <span className="text-sm font-mono text-blue-400">
          {value != null ? `${value}${unit}` : '—'}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value ?? ''}
        onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
        onDoubleClick={() => onChange(null)}
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

  const initialForm: SkyCheckForm = {
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    location: 'Aesch ZH',
    cloud_cover: null,
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
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Fetch moon phase
  const { data: moonData } = useQuery({
    queryKey: ['moon', form.date],
    queryFn: () => getMoon(form.date),
    staleTime: 60 * 60 * 1000, // 1 hour
  })

  // Auto-fill from weather when available
  useEffect(() => {
    if (weatherData) {
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

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Sky Check</h1>
          <p className="text-sm text-gray-500 mt-1">Log tonight's conditions</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-[hsl(220_15%_10%)] px-3 py-1.5 rounded-lg border border-[hsl(215_15%_18%)]">
          <Clock className="w-4 h-4" />
          {form.date} {form.time}
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

        {/* Cloud Cover */}
        <SliderInput
          label="Cloud Cover"
          value={form.cloud_cover}
          onChange={v => setField('cloud_cover', v)}
          min={0}
          max={100}
          unit="%"
          icon={Cloud}
        />

        {/* Transparency & Seeing */}
        <div className="bg-[hsl(220_15%_10%)] rounded-lg p-4 border border-[hsl(215_15%_18%)] space-y-3">
          <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-2">
            <Eye className="w-4 h-4" />
            Sky Quality Ratings
          </div>
          <StarRating
            label="Transparency"
            value={form.transparency}
            onChange={v => setField('transparency', v)}
          />
          <StarRating
            label="Seeing"
            value={form.seeing}
            onChange={v => setField('seeing', v)}
          />
        </div>

        {/* Weather */}
        <div className="bg-[hsl(220_15%_10%)] rounded-lg p-4 border border-[hsl(215_15%_18%)] space-y-4">
          <div className="text-sm text-gray-400">Weather</div>
          
          <SliderInput
            label="Temperature"
            value={form.temperature}
            onChange={v => setField('temperature', v)}
            min={-20}
            max={40}
            unit="°C"
            icon={Thermometer}
          />

          <SliderInput
            label="Humidity"
            value={form.humidity}
            onChange={v => setField('humidity', v)}
            min={0}
            max={100}
            unit="%"
            icon={Droplets}
          />

          <SliderInput
            label="Wind Speed"
            value={form.wind_speed}
            onChange={v => setField('wind_speed', v)}
            min={0}
            max={100}
            unit=" km/h"
            icon={Wind}
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
            onClick={() => navigate('/journal')}
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
