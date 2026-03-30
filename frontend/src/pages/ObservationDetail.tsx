import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getObservation, deleteObservation } from '@/lib/api'
import { format } from 'date-fns'
import {
  Moon, Cloud, Star, MapPin, Camera, Edit2, Trash2,
  ArrowLeft, Image, Thermometer, Wind, Droplets, ExternalLink,
} from 'lucide-react'

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
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

  const { data: obs, isLoading } = useQuery({
    queryKey: ['observation', id],
    queryFn: () => getObservation(Number(id)),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteObservation(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['observations'] })
      navigate('/journal')
    },
  })

  if (isLoading) return <p className="text-gray-500">Loading…</p>
  if (!obs) return <p>Not found.</p>

  const weather = obs.weather_json ? JSON.parse(obs.weather_json) : null
  const gearTags = obs.gear ? obs.gear.split(',').map(s => s.trim()).filter(Boolean) : []

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back link */}
      <Link
        to="/journal"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Journal
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 pb-6 border-b border-[hsl(215_15%_18%)]">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {obs.target_catalog_id && (
              <span className="font-mono text-blue-400 text-sm">{obs.target_catalog_id}</span>
            )}
            <h1 className="text-2xl font-bold">{obs.target_name}</h1>
          </div>
          <p className="text-gray-500 text-sm">
            {format(new Date(obs.date), 'EEEE, d MMMM yyyy')} · {obs.time}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to={`/observations/${obs.id}/edit`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors"
            style={{ backgroundColor: 'hsl(220 15% 14%)', border: '1px solid hsl(215 15% 22%)' }}
          >
            <Edit2 className="w-4 h-4 text-gray-400" />
            <span className="text-gray-300">Edit</span>
          </Link>
          <button
            onClick={() => { if (confirm('Delete this observation permanently?')) deleteMutation.mutate() }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors"
            style={{ backgroundColor: 'hsl(0 50% 20%)', border: '1px solid hsl(0 50% 30%)' }}
          >
            <Trash2 className="w-4 h-4 text-red-400" />
            <span className="text-red-400">Delete</span>
          </button>
        </div>
      </div>

      {/* Quick facts row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 pb-6 border-b border-[hsl(215_15%_18%)]">
        {obs.moon_phase != null && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'hsl(220 15% 10%)' }}>
            <Moon className="w-4 h-4 text-gray-500 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Moon</p>
              <p className="text-sm font-medium">{obs.moon_phase_name}</p>
              <p className="text-xs text-gray-500">{Math.round(obs.moon_phase * 100)}%</p>
            </div>
          </div>
        )}
        {obs.location && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'hsl(220 15% 10%)' }}>
            <MapPin className="w-4 h-4 text-gray-500 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Location</p>
              <p className="text-sm font-medium">{obs.location}</p>
            </div>
          </div>
        )}
        {obs.seeing_rating && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'hsl(220 15% 10%)' }}>
            <Star className="w-4 h-4 text-yellow-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Sky</p>
              <p className="text-sm font-medium">{'★'.repeat(obs.seeing_rating)}{'☆'.repeat(5 - obs.seeing_rating)}</p>
            </div>
          </div>
        )}
        {weather && (
          <>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'hsl(220 15% 10%)' }}>
              <Thermometer className="w-4 h-4 text-gray-500 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Temp</p>
                <p className="text-sm font-medium">{Math.round(weather.temperature)}°C</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'hsl(220 15% 10%)' }}>
              <Cloud className="w-4 h-4 text-gray-500 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Clouds</p>
                <p className="text-sm font-medium">{weather.cloud_cover}%</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'hsl(220 15% 10%)' }}>
              <Droplets className="w-4 h-4 text-gray-500 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Humidity</p>
                <p className="text-sm font-medium">{weather.humidity}% RH</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Notes */}
      {obs.notes_text && (
        <Section title="Field Notes" icon={<span className="text-xs">📝</span>}>
          <div className="rounded-lg px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed"
               style={{ backgroundColor: 'hsl(220 15% 10%)', color: 'hsl(210 40% 80%)' }}>
            {obs.notes_text}
          </div>
        </Section>
      )}

      {/* Equipment */}
      {gearTags.length > 0 && (
        <Section title="Equipment" icon={<Camera className="w-3.5 h-3.5 text-gray-500" />}>
          <div className="flex flex-wrap gap-2">
            {gearTags.map(tag => (
              <span key={tag} className="px-2.5 py-1 text-xs rounded-full"
                    style={{ backgroundColor: 'hsl(220 15% 14%)', color: 'hsl(210 80% 60%)', border: '1px solid hsl(215 15% 22%)' }}>
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
          icon={<Image className="w-3.5 h-3.5 text-gray-500" />}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {obs.photos.map(photo => (
              <a
                key={photo.id}
                href={photo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-square rounded-lg overflow-hidden border transition-colors"
                style={{ borderColor: 'hsl(215 15% 22%)' }}
              >
                <img
                  src={photo.url}
                  alt={photo.original_name || 'Observation photo'}
                  className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </Section>
      )}

      {/* Wiki link */}
      {obs.target_catalog_id && (
        <div className="mt-6 pt-6 border-t border-[hsl(215_15%_18%)]">
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
            className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Read more about {obs.target_catalog_id} on Wikipedia
          </a>
        </div>
      )}
    </div>
  )
}