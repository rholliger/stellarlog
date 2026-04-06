import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Cloud, Eye, Check, Plus, ChevronRight, RefreshCw } from 'lucide-react'
import { listSkyChecks, createSkyCheck, getWeather } from '@/lib/api'
import { useToast } from '@/components/Toast'

// Option 1: Compact Card with Quick Actions
export function SkyCheckCardCompact() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  
  const { data: latestCheck } = useQuery({
    queryKey: ['sky-checks-latest'],
    queryFn: () => listSkyChecks({ limit: 1 }),
    select: (data) => data[0],
  })

  const { data: weather } = useQuery({
    queryKey: ['weather'],
    queryFn: getWeather,
    staleTime: 5 * 60 * 1000,
  })

  const today = format(new Date(), 'yyyy-MM-dd')
  const hasCheckedToday = latestCheck?.date === today

  const quickCheckMutation = useMutation({
    mutationFn: () => createSkyCheck({
      date: today,
      time: format(new Date(), 'HH:mm'),
      location: 'Aesch ZH',
      cloud_cover: weather?.cloud_cover ?? 0,
      temperature: weather?.temperature,
      humidity: weather?.humidity,
      wind_speed: weather?.wind_speed,
      notes: 'Quick check from Tonight page',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sky-checks'] })
      showToast('Sky check logged!', 'success')
    },
  })

  if (hasCheckedToday) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-400">Checked tonight</p>
              <p className="text-xs text-gray-500">
                {latestCheck.cloud_cover != null && `${latestCheck.cloud_cover}% clouds · `}
                {latestCheck.transparency && `Trans ${'★'.repeat(latestCheck.transparency)} · `}
                {latestCheck.seeing && `Seeing ${'★'.repeat(latestCheck.seeing)}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/sky-checks')}
            className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
          >
            History <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[hsl(220_15%_11%)] border border-[hsl(215_15%_18%)] rounded-xl p-3 sm:p-4 hover:border-blue-500/40 transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Cloud className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-200">How's the sky right now?</p>
            <p className="text-xs text-gray-500">Log conditions to track patterns</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => quickCheckMutation.mutate()}
            disabled={quickCheckMutation.isPending}
            className="text-xs px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
          >
            {quickCheckMutation.isPending ? '...' : 'Quick Log'}
          </button>
          <button
            onClick={() => navigate('/sky-check')}
            className="text-xs px-3 py-1.5 bg-[hsl(220_15%_14%)] text-gray-400 rounded-lg border border-[hsl(215_15%_22%)] hover:text-gray-300 transition-colors"
          >
            Details
          </button>
        </div>
      </div>
    </div>
  )
}

// Option 2: Inline Mini Form
export function SkyCheckMiniForm() {
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [isExpanded, setIsExpanded] = useState(false)
  
  const [cloudCover, setCloudCover] = useState(0)
  const [transparency, setTransparency] = useState<number | null>(null)
  const [seeing, setSeeing] = useState<number | null>(null)

  const saveMutation = useMutation({
    mutationFn: () => createSkyCheck({
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      location: 'Aesch ZH',
      cloud_cover: cloudCover,
      transparency,
      seeing,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sky-checks'] })
      showToast('Sky check saved!', 'success')
      setIsExpanded(false)
      setCloudCover(0)
      setTransparency(null)
      setSeeing(null)
    },
  })

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full bg-[hsl(220_15%_11%)] border border-dashed border-[hsl(215_15%_25%)] rounded-xl p-3 sm:p-4 text-center hover:border-blue-500/40 hover:bg-blue-500/5 transition-all group"
      >
        <div className="flex items-center justify-center gap-2 text-gray-500 group-hover:text-gray-400">
          <Plus className="w-4 h-4" />
          <span className="text-sm">Log current sky conditions</span>
        </div>
      </button>
    )
  }

  return (
    <div className="bg-[hsl(220_15%_11%)] border border-[hsl(215_15%_18%)] rounded-xl p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-200">Quick Sky Check</p>
        <button 
          onClick={() => setIsExpanded(false)}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          Cancel
        </button>
      </div>

      {/* Cloud Cover */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span>Cloud Cover</span>
          <span className="font-mono text-blue-400">{cloudCover}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={cloudCover}
          onChange={(e) => setCloudCover(Number(e.target.value))}
          className="w-full h-2 bg-gray-800 rounded-lg accent-blue-500"
        />
      </div>

      {/* Transparency & Seeing */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-xs text-gray-400 mb-1">Transparency</p>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setTransparency(transparency === n ? null : n)}
                className={`text-lg ${n <= (transparency || 0) ? 'text-yellow-400' : 'text-gray-700'}`}
              >
                ★
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Seeing</p>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setSeeing(seeing === n ? null : n)}
                className={`text-lg ${n <= (seeing || 0) ? 'text-yellow-400' : 'text-gray-700'}`}
              >
                ★
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="flex-1 text-xs px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
        >
          {saveMutation.isPending ? 'Saving...' : 'Save Check'}
        </button>
        <button
          onClick={() => window.location.href = '/sky-check'}
          className="text-xs px-3 py-2 bg-[hsl(220_15%_14%)] text-gray-400 rounded-lg border border-[hsl(215_15%_22%)] hover:text-gray-300 transition-colors"
        >
          Full Form →
        </button>
      </div>
    </div>
  )
}

// Option 3: Subtle Button Row
export function SkyCheckButtonRow() {
  const navigate = useNavigate()
  const { data: latestCheck } = useQuery({
    queryKey: ['sky-checks-latest'],
    queryFn: () => listSkyChecks({ limit: 1 }),
    select: (data) => data[0],
  })

  const today = format(new Date(), 'yyyy-MM-dd')
  const hasCheckedToday = latestCheck?.date === today

  return (
    <div className="flex items-center justify-between bg-[hsl(220_15%_10%)] border border-[hsl(215_15%_18%)] rounded-xl px-3 sm:px-4 py-2.5">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-400">
          {hasCheckedToday ? 'Sky checked today' : 'Check the sky?'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {hasCheckedToday && (
          <span className="text-xs text-green-400">
            {latestCheck.transparency && `${'★'.repeat(latestCheck.transparency)} trans`}
          </span>
        )}
        <button
          onClick={() => navigate(hasCheckedToday ? '/sky-checks' : '/sky-check')}
          className="text-xs px-2.5 py-1 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
        >
          {hasCheckedToday ? 'View History' : 'Log Now'}
        </button>
      </div>
    </div>
  )
}

// Option 4: Weather Card Integration
export function SkyCheckWeatherIntegration() {
  const navigate = useNavigate()
  const { data: latestCheck } = useQuery({
    queryKey: ['sky-checks-latest'],
    queryFn: () => listSkyChecks({ limit: 1 }),
    select: (data) => data[0],
  })

  const today = format(new Date(), 'yyyy-MM-dd')
  const hasCheckedToday = latestCheck?.date === today

  return (
    <div 
      onClick={() => navigate('/sky-check')}
      className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-4 cursor-pointer hover:border-blue-500/50 transition-all group"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-blue-300 group-hover:text-blue-200">
            {hasCheckedToday ? 'Update Sky Check' : 'Log Sky Conditions'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {hasCheckedToday 
              ? `Last: ${latestCheck.cloud_cover}% clouds, ${latestCheck.transparency}★ transparency`
              : 'Compare forecast vs reality'
            }
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
          {hasCheckedToday ? (
            <RefreshCw className="w-5 h-5 text-blue-400" />
          ) : (
            <Cloud className="w-5 h-5 text-blue-400" />
          )}
        </div>
      </div>
    </div>
  )
}
