import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getObservation, deleteObservation } from '@/lib/api'
import { format } from 'date-fns'
import {
  Moon, Cloud, Star, MapPin, Camera, Edit2, Trash2,
  ArrowLeft, Image, Thermometer, Wind, Droplets,
} from 'lucide-react'

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
      navigate('/')
    },
  })

  if (isLoading) return <p className="text-muted-foreground">Loading...</p>
  if (!obs) return <p>Not found.</p>

  const weather = obs.weather_json ? JSON.parse(obs.weather_json) : null

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2 w-fit">
            <ArrowLeft className="w-4 h-4" /> Back to Journal
          </Link>
          <h1 className="text-2xl font-bold">
            {obs.target_catalog_id && (
              <span className="text-muted-foreground mr-2">{obs.target_catalog_id}</span>
            )}
            {obs.target_name}
          </h1>
          <p className="text-muted-foreground mt-0.5">
            {format(new Date(obs.date), 'EEEE, d MMMM yyyy')} · {obs.time}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/observations/${obs.id}/edit`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors"
          >
            <Edit2 className="w-4 h-4" /> Edit
          </Link>
          <button
            onClick={() => {
              if (confirm('Delete this observation?')) deleteMutation.mutate()
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-md transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap gap-2 mb-6">
        {obs.moon_phase != null && (
          <span className="flex items-center gap-1.5 text-sm bg-muted px-3 py-1 rounded-full">
            <Moon className="w-4 h-4" />
            {obs.moon_phase_name} ({Math.round(obs.moon_phase * 100)}%)
          </span>
        )}
        {obs.location && (
          <span className="flex items-center gap-1.5 text-sm bg-muted px-3 py-1 rounded-full">
            <MapPin className="w-4 h-4" /> {obs.location}
          </span>
        )}
        {obs.seeing_rating && (
          <span className="flex items-center gap-1.5 text-sm bg-muted px-3 py-1 rounded-full">
            <Star className="w-4 h-4 text-yellow-400" />
            {'★'.repeat(obs.seeing_rating)}{'☆'.repeat(5 - obs.seeing_rating)}
          </span>
        )}
        {weather && (
          <>
            <span className="flex items-center gap-1.5 text-sm bg-muted px-3 py-1 rounded-full">
              <Thermometer className="w-4 h-4" /> {Math.round(weather.temperature)}°C
            </span>
            <span className="flex items-center gap-1.5 text-sm bg-muted px-3 py-1 rounded-full">
              <Cloud className="w-4 h-4" /> {weather.cloud_cover}% clouds
            </span>
            <span className="flex items-center gap-1.5 text-sm bg-muted px-3 py-1 rounded-full">
              <Wind className="w-4 h-4" /> {weather.wind_speed} km/h
            </span>
            <span className="flex items-center gap-1.5 text-sm bg-muted px-3 py-1 rounded-full">
              <Droplets className="w-4 h-4" /> {weather.humidity}% RH
            </span>
          </>
        )}
      </div>

      {/* Gear */}
      {obs.gear && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
            <Camera className="w-4 h-4" /> Equipment
          </h3>
          <p className="text-sm bg-muted rounded-lg px-3 py-2">{obs.gear}</p>
        </div>
      )}

      {/* Notes */}
      {obs.notes_text && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Notes</h3>
          <div className="text-sm bg-muted rounded-lg px-4 py-3 whitespace-pre-wrap">
            {obs.notes_text}
          </div>
        </div>
      )}

      {/* Photos */}
      {obs.photos.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
            <Image className="w-4 h-4" /> Photos ({obs.photos.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {obs.photos.map(photo => (
              <a
                key={photo.id}
                href={photo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-square rounded-lg overflow-hidden border border-border hover:border-primary/40 transition-colors"
              >
                <img
                  src={photo.url}
                  alt={photo.original_name || 'Observation photo'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
