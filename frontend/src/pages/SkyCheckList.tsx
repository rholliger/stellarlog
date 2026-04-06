import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { listSkyChecks, deleteSkyCheck, type SkyCheck } from '@/lib/api'
import { useToast } from '@/components/Toast'
import {
  Cloud, Eye, Thermometer, Droplets, Wind, Moon,
  ArrowLeft, Trash2, Calendar, Clock
} from 'lucide-react'

export default function SkyCheckList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const { data: skyChecks, isLoading } = useQuery({
    queryKey: ['sky-checks'],
    queryFn: () => listSkyChecks({ limit: 50 }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSkyCheck,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sky-checks'] })
      showToast('Sky check deleted', 'success')
      setDeletingId(null)
    },
    onError: () => {
      showToast('Failed to delete', 'error')
      setDeletingId(null)
    },
  })

  const handleDelete = (id: number) => {
    if (confirm('Delete this sky check?')) {
      setDeletingId(id)
      deleteMutation.mutate(id)
    }
  }

  const formatSwissDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd.MM.yyyy')
    } catch {
      return dateStr
    }
  }

  const getConditionEmoji = (check: SkyCheck) => {
    if (check.cloud_cover === 0) return '✨'
    if (check.cloud_cover && check.cloud_cover < 30) return '🌤️'
    if (check.cloud_cover && check.cloud_cover < 70) return '☁️'
    return '☁️'
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/sky-check')}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-2xl font-bold">Sky Check History</h1>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : !skyChecks?.length ? (
        <div className="text-center py-12">
          <Cloud className="w-12 h-12 mx-auto text-gray-700 mb-4" />
          <p className="text-gray-500">No sky checks yet</p>
          <button
            onClick={() => navigate('/sky-check')}
            className="mt-4 text-blue-400 hover:text-blue-300"
          >
            Log your first check
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {skyChecks.map((check) => (
            <div
              key={check.id}
              className="bg-[hsl(220_15%_10%)] rounded-lg p-4 border border-[hsl(215_15%_18%)] hover:border-[hsl(215_15%_25%)] transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getConditionEmoji(check)}</span>
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Calendar className="w-3.5 h-3.5 text-gray-500" />
                      {formatSwissDate(check.date)}
                      <Clock className="w-3.5 h-3.5 text-gray-500 ml-2" />
                      {check.time}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {check.location}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(check.id)}
                  disabled={deletingId === check.id}
                  className="text-gray-600 hover:text-red-400 transition-colors p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Conditions grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-[hsl(215_15%_18%)]">
                {check.cloud_cover != null && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Cloud className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-gray-400">Clouds:</span>
                    <span className="text-gray-300">{check.cloud_cover}%</span>
                  </div>
                )}
                {check.transparency && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Eye className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-gray-400">Trans:</span>
                    <span className="text-yellow-400">{'★'.repeat(check.transparency)}</span>
                  </div>
                )}
                {check.seeing && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Eye className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-gray-400">Seeing:</span>
                    <span className="text-yellow-400">{'★'.repeat(check.seeing)}</span>
                  </div>
                )}
                {check.temperature != null && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Thermometer className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-gray-400">Temp:</span>
                    <span className="text-gray-300">{check.temperature}°C</span>
                  </div>
                )}
                {check.humidity != null && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Droplets className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-gray-400">Hum:</span>
                    <span className="text-gray-300">{check.humidity}%</span>
                  </div>
                )}
                {check.wind_speed != null && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Wind className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-gray-400">Wind:</span>
                    <span className="text-gray-300">{check.wind_speed} km/h</span>
                  </div>
                )}
                {check.moon_phase && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Moon className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-gray-400">Moon:</span>
                    <span className="text-gray-300">{check.moon_phase}</span>
                  </div>
                )}
              </div>

              {check.notes && (
                <div className="mt-3 text-xs text-gray-500 italic">
                  &ldquo;{check.notes}&rdquo;
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
