import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import {
  getObservation, createObservation, updateObservation,
  uploadPhoto, getAllTargets, transcribe, getMoon,
} from '@/lib/api'
import { Target } from '@/lib/api'
import { format } from 'date-fns'
import {
  Mic, MicOff, Upload, X, Star, MapPin, Calendar,
  Cloud, Moon as MoonIcon, Camera, Save, Loader2,
} from 'lucide-react'

const AESH_LOCATION = { lat: 47.468, lon: 8.066 }

function TargetSelector({
  value,
  onChange,
}: {
  value: string
  onChange: (id: string, name: string) => void
}) {
  const { data: targets } = useQuery({
    queryKey: ['targets', 'all'],
    queryFn: getAllTargets,
  })
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = targets?.filter(
    t =>
      !search ||
      t.catalog_id.toLowerCase().includes(search.toLowerCase()) ||
      (t.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.common_name || '').toLowerCase().includes(search.toLowerCase())
  )

  const selected = targets?.find(
    t => t.catalog_id === value || `${t.source_catalog} ${t.catalog_id}` === value
  )

  return (
    <div className="relative">
      <label className="block text-sm font-medium mb-1">Target *</label>
      <input
        type="text"
        value={open ? search : (selected ? `${selected.catalog_id} — ${selected.name || selected.common_name}` : value)}
        onFocus={() => setOpen(true)}
        onChange={e => {
          setSearch(e.target.value)
          setOpen(true)
        }}
        placeholder="Search M42, NGC 224, Caldwell 1..."
        className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {(filtered || []).slice(0, 50).map(t => (
            <button
              key={`${t.source_catalog}-${t.catalog_id}`}
              className="w-full text-left px-3 py-2 text-sm hover:bg-primary/10 flex items-center justify-between"
              onClick={() => {
                onChange(`${t.source_catalog || ''} ${t.catalog_id}`.trim(), t.name || t.common_name || t.catalog_id)
                setOpen(false)
                setSearch('')
              }}
            >
              <span>
                <span className="font-mono text-primary">{t.catalog_id}</span>{' '}
                <span>{t.name || t.common_name}</span>
                {t.type && <span className="text-muted-foreground ml-2 text-xs">{t.type}</span>}
              </span>
              <span className="text-xs text-muted-foreground">{t.constellation}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function VoiceInput({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [recording, setRecording] = useState(false)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const media = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRef.current = media
      chunksRef.current = []
      media.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data) }
      media.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        try {
          const { transcript } = await transcribe(new File([blob], 'recording.webm'))
          onTranscript(transcript)
        } catch {
          console.error('Transcription failed')
        }
        stream.getTracks().forEach(t => t.stop())
      }
      media.start()
      setRecording(true)
    } catch {
      console.error('Microphone access denied')
    }
  }

  const stopRecording = () => {
    mediaRef.current?.stop()
    setRecording(false)
  }

  return (
    <button
      type="button"
      onClick={recording ? stopRecording : startRecording}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
        recording
          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
          : 'bg-muted hover:bg-muted/80 text-muted-foreground'
      }`}
    >
      {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      {recording ? 'Stop' : 'Voice'}
    </button>
  )
}

function PhotoDropzone({ observationId, onUploaded }: {
  observationId: number | null
  onUploaded: () => void
}) {
  const [uploading, setUploading] = useState(false)
  const onDrop = useCallback(async (files: File[]) => {
    if (!observationId) return
    setUploading(true)
    for (const file of files) {
      await uploadPhoto(observationId, file)
    }
    setUploading(false)
    onUploaded()
  }, [observationId, onUploaded])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    disabled: !observationId,
  })

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
        isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'
      } ${!observationId ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input {...getInputProps()} />
      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        {uploading ? 'Uploading...' : isDragActive ? 'Drop photos here' : 'Drag & drop photos, or click to select'}
      </p>
      <p className="text-xs text-muted-foreground mt-1">JPG, PNG, RAW — save the session first to enable upload</p>
    </div>
  )
}

function SeeingRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">Seeing</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`text-lg transition-colors ${n <= value ? 'text-yellow-400' : 'text-muted-foreground/30'}`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  )
}

export default function NewObservation() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [form, setForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    target_catalog_id: '',
    target_name: '',
    notes_text: '',
    seeing_rating: 3,
    location: 'Aesch ZH',
    gear: '',
  })
  const [moonInfo, setMoonInfo] = useState<{ illumination: number; phase_name: string } | null>(null)

  const { data: existing } = useQuery({
    queryKey: ['observation', id],
    queryFn: () => getObservation(Number(id)),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existing) {
      setForm({
        date: existing.date,
        time: existing.time,
        target_catalog_id: existing.target_catalog_id || '',
        target_name: existing.target_name,
        notes_text: existing.notes_text || '',
        seeing_rating: existing.seeing_rating || 3,
        location: existing.location,
        gear: existing.gear || '',
      })
    }
  }, [existing])

  // Fetch moon info when date changes
  useEffect(() => {
    if (form.date) {
      getMoon(form.date).then(m => setMoonInfo({ illumination: m.illumination, phase_name: m.phase_name }))
    }
  }, [form.date])

  const saveMutation = useMutation({
    mutationFn: (data: Partial typeof form) =>
      isEdit ? updateObservation(Number(id), data) : createObservation(data),
    onSuccess: (obs) => {
      queryClient.invalidateQueries({ queryKey: ['observations'] })
      navigate(`/observations/${obs.id}`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate({
      date: form.date,
      time: form.time,
      target_catalog_id: form.target_catalog_id || null,
      target_name: form.target_name,
      notes_text: form.notes_text || null,
      seeing_rating: form.seeing_rating,
      location: form.location,
      gear: form.gear || null,
    })
  }

  const handleVoiceTranscript = (text: string) => {
    setForm(f => ({ ...f, notes_text: f.notes_text ? `${f.notes_text}\n${text}` : text }))
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{isEdit ? 'Edit Session' : 'New Observation Session'}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium mb-1">
              <Calendar className="w-4 h-4 text-muted-foreground" /> Date
            </label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Time (local)</label>
            <input
              type="time"
              value={form.time}
              onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>
        </div>

        {/* Moon indicator */}
        {moonInfo && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            <MoonIcon className="w-4 h-4" />
            Moon: {moonInfo.phase_name} ({Math.round(moonInfo.illumination * 100)}% illuminated)
          </div>
        )}

        {/* Target selector */}
        <TargetSelector
          value={form.target_catalog_id}
          onChange={(id, name) => setForm(f => ({ ...f, target_catalog_id: id, target_name: name }))}
        />

        {/* Notes */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium">Notes</label>
            <VoiceInput onTranscript={handleVoiceTranscript} />
          </div>
          <textarea
            value={form.notes_text}
            onChange={e => setForm(f => ({ ...f, notes_text: e.target.value }))}
            placeholder="What did you observe? How did it go? Equipment used? Conditions?"
            rows={5}
            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
          />
        </div>

        {/* Seeing */}
        <SeeingRating
          value={form.seeing_rating}
          onChange={v => setForm(f => ({ ...f, seeing_rating: v }))}
        />

        {/* Gear */}
        <div>
          <label className="block text-sm font-medium mb-1">Gear / Equipment</label>
          <input
            type="text"
            value={form.gear}
            onChange={e => setForm(f => ({ ...f, gear: e.target.value }))}
            placeholder="e.g. Seestar S50, 200mm f/5, ISO 1600, 60s"
            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Location */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium mb-1">
            <MapPin className="w-4 h-4 text-muted-foreground" /> Location
          </label>
          <input
            type="text"
            value={form.location}
            onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            placeholder="Aesch ZH"
            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Photo dropzone (only after save) */}
        {saveMutation.data && (
          <PhotoDropzone
            observationId={saveMutation.data.id}
            onUploaded={() => queryClient.invalidateQueries({ queryKey: ['observation', saveMutation.data.id] })}
          />
        )}

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'Save Changes' : 'Save Session'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
