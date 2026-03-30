import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getObservation, deleteObservation } from '@/lib/api'
import { format } from 'date-fns'
import {
  Moon, Cloud, Star, MapPin, Camera, Edit2, Trash2,
  ArrowLeft, Image, Thermometer, Wind, Droplets, ExternalLink,
} from 'lucide-react'
import { useToast } from '@/components/Toast'
import { Lightbox } from '@/components/Lightbox'
import { DetailSkeleton } from '@/components/Skeleton'

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-5 sm:mb-6">
      <h2 className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 sm:mb-3">
        {icon}
        {title}
      </h2>
      {children}
    </div>
  )
}

export default function ObservationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const { data: obs, isLoading } = useQuery({
    queryKey: ['observation', id],
    queryFn: () => getObservation(Number(id)),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteObservation(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['observations'] })
      showToast('Observation deleted', 'success')
      navigate('/journal')
    },
    onError: () => {
      showToast('Failed to delete observation', 'error')
    },
  })

  const handleDelete = () => {
    if (confirm('Delete this observation permanently?')) {
      deleteMutation.mutate()
    }
  }

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  if (isLoading) return <DetailSkeleton />
  if (!obs) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 sm:py-16 px-4">
        <p className="text-gray-500">Observation not found.</p>
        <Link to="/journal" className="text-blue-400 hover:text-blue-300 mt-4 inline-block">
          Back to Journal
        </Link>
      </div>
    )
  }

  const weather = obs.weather_json ? JSON.parse(obs.weather_json) : null
  const gearTags = obs.gear ? obs.gear.split(',').map(s => s.trim()).filter(Boolean) : []

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back link */}
      <Link
        to="/journal"
        className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-gray-500 hover:text-gray-300 mb-4 sm:mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        Back to Journal
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-[hsl(215_15%_18%)]">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1">
            {obs.target_catalog_id && (
              <span className="font-mono text-blue-400 text-xs sm:text-sm shrink-0">{obs.target_catalog_id}</span>
            )}
            <h1 className="text-xl sm:text-2xl font-bold truncate">{obs.target_name}</h1>
          </div>
          <p className="text-gray-500 text-xs sm:text-sm">
            {format(new Date(obs.date), 'EEEE, d MMMM yyyy')} · {obs.time}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to={`/observations/${obs.id}/edit`}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-[hsl(220_15%_14%)] border border-[hsl(215_15%_22%)] hover:border-[hsl(215_15%_30%)] transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
            <span className="text-gray-300 hidden sm:inline">Edit</span>
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" />
            <span className="text-red-400 hidden sm:inline">{deleteMutation.isPending ? 'Deleting...' : 'Delete'}</span>
          </button>
        </div>
      </div>

      {/* Quick facts row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-[hsl(215_15%_18%)]">
        {obs.moon_phase != null && (
          <div className="flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-lg bg-[hsl(220_15%_10%)] border border-[hsl(215_15%_18%)]">
            <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Moon</p>
              <p className="text-xs sm:text-sm font-medium truncate">{obs.moon_phase_name}</p>
              <p className="text-xs text-gray-500">{Math.round(obs.moon_phase * 100)}%</p>
            </div>
          </div>
        )}
        {obs.location && (
          <div className="flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-lg bg-[hsl(220_15%_10%)] border border-[hsl(215_15%_18%)]">
            <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Location</p>
              <p className="text-xs sm:text-sm font-medium truncate">{obs.location}</p>
            </div>
          </div>
        )}
        {obs.seeing_rating && (
          <div className="flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-lg bg-[hsl(220_15%_10%)] border border-[hsl(215_15%_18%)]">
            <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Sky</p>
              <p className="text-xs sm:text-sm font-medium">{'★'.repeat(obs.seeing_rating)}{'☆'.repeat(5 - obs.seeing_rating)}</p>
            </div>
          </div>
        )}
        {weather && (
          <>
            <div className="flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-lg bg-[hsl(220_15%_10%)] border border-[hsl(215_15%_18%)]">
              <Thermometer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Temp</p>
                <p className="text-xs sm:text-sm font-medium">{Math.round(weather.temperature)}°C</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-lg bg-[hsl(220_15%_10%)] border border-[hsl(215_15%_18%)]">
              <Cloud className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Clouds</p>
                <p className="text-xs sm:text-sm font-medium">{weather.cloud_cover}%</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-lg bg-[hsl(220_15%_10%)] border border-[hsl(215_15%_18%)]">
              <Droplets className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Humidity</p>
                <p className="text-xs sm:text-sm font-medium">{weather.humidity}%</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Notes */}
      {obs.notes_text && (
        <Section title="Field Notes" icon={<span className="text-xs">📝</span>}>
          <div className="rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed bg-[hsl(220_15%_10%)] border border-[hsl(215_15%_18%)] text-gray-300">
            {obs.notes_text}
          </div>
        </Section>
      )}

      {/* Equipment */}
      {gearTags.length > 0 && (
        <Section title="Equipment" icon={<Camera className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500" />}>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {gearTags.map(tag => (
              <span key={tag} className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs rounded-full bg-[hsl(220_15%_14%)] text-blue-300 border border-[hsl(215_15%_22%)]">
                {tag}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Photos */}
      {obs.photos.length > 0 && (
        <Section
          title={`Photos (${obs.photos.length})`}
          icon={<Image className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500" />}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {obs.photos.map((photo, index) => (
              <button
                key={photo.id}
                onClick={() => openLightbox(index)}
                className="block aspect-square rounded-lg overflow-hidden border border-[hsl(215_15%_22%)] hover:border-blue-500/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <img
                  src={photo.url}
                  alt={photo.original_name || 'Observation photo'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* Lightbox */}
      {obs.photos.length > 0 && (
        <Lightbox
          photos={obs.photos}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      {/* Wiki link */}
      {obs.target_catalog_id && (
        <div className="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-[hsl(215_15%_18%)]">
          <a
            href={(() => {
              const clean = obs.target_catalog_id!.trim()
              const caldwellMatch = clean.match(/^C\s*(\d+)$/i)
              if (caldwellMatch) {
                return `https://en.wikipedia.org/wiki/Caldwell_${encodeURIComponent(caldwellMatch[1])}`
              }
              return `https://en.wikipedia.org/wiki/${encodeURIComponent(clean.replace(/\s+/g, '_'))}`
            })()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs sm:text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Read more about {obs.target_catalog_id} on Wikipedia
          </a>
        </div>
      )}
    </div>
  )
}
