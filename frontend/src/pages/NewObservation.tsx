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
  Cloud, Moon as MoonIcon, Camera, Save, Loader2, Image,
} from 'lucide-react'

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
    t => `${t.source_catalog || ''} ${t.catalog_id}`.trim() === value
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
        className="w-full"
      />
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[hsl(220_15%_11%)] border border-[hsl(215_15%_22%)] rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {(filtered || []).slice(0, 50).map(t => (
            <button
              key={`${t.source_catalog}-${t.catalog_id}`}
              className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(220_15%_18%)] flex items-center justify-between"
              onClick={() => {
                onChange(`${t.source_catalog || ''} ${t.catalog_id}`.trim(), t.name || t.common_name || t.catalog_id)
                setOpen(false)
                setSearch('')
              }}
            >
              <span>
                <span className="font-mono text-blue-400 mr-1">{t.catalog_id}</span>
                <span>{t.name || t.common_name}</span>
                {t.type && <span className="text-gray-500 ml-2 text-xs">{t.type}</span>}
              </span>
              <span className="text-xs text-gray-500">{t.constellation}</span>
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
          : 'bg-[hsl(220_15%_14%)] hover:bg-[hsl(220_15%_18%)] text-gray-400 border border-[hsl(215_15%_22%)]'
      }`}
    >
      {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      {recording ? 'Stop' : 'Voice'}
    </button>
  )
}

function PhotoDropzone({ observationId, onUploaded, uploadedFiles }: {
  observationId: number | null
  onUploaded: () => void
  uploadedFiles: string[]
}) {
  const [uploading, setUploading] = useState(false)
  const onDrop = useCallback(async (files: File[]) => {
    if (!observationId) {
      alert('Save the session first to upload photos.')
      return
    }
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
    <div>
      <label className="flex items-center gap-1.5 text-sm font-medium mb-2">
        <Image className="w-4 h-4 text-gray-500" />
        Photos
        {uploadedFiles.length > 0 && (
          <span className="text-xs text-gray-500 font-normal">({uploadedFiles.length} uploaded)</span>
        )}
      </label>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          !observationId
            ? 'opacity-50 cursor-not-allowed border-gray-700'
            : isDragActive
              ? 'border-blue-500 bg-blue-500/5'
              : 'border-[hsl(215_15%_22%)] hover:border-[hsl(215_15%_30%)] bg-[hsl(220_15%_11%)]'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-500" />
        <p className="text-sm text-gray-500">
          {uploading ? 'Uploading...' : isDragActive ? 'Drop photos here' : 'Drag & drop or click to select'}
        </p>
        <p className="text-xs text-gray-600 mt-1">JPG, PNG, RAW — {observationId ? 'ready to upload' : 'save session first'}</p>
      </div>
      {uploadedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {uploadedFiles.map(f => (
            <span key={f} className="text-xs bg-[hsl(220_15%_14%)] px-2 py-1 rounded text-gray-400 flex items-center gap-1">
              <Image className="w-3 h-3" /> {f}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function SeeingRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const labels = ['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent']
  return (
    <div>
      <label className="block text-sm font-medium mb-2">Sky Conditions</label>
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`text-xl transition-colors ${n <= value ? 'text-yellow-400' : 'text-gray-700'}`}
            >
              ★
            </button>
          ))}
        </div>
        <span className="text-sm text-gray-400">{labels[value] || '—'}</span>
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
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([])
  const [draftId, setDraftId] = useState<number | null>(null)

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
      setDraftId(existing.id)
      setUploadedPhotos(existing.photos.map((p: any) => p.original_name || p.filename))
    }
  }, [existing])

  // Fetch moon info when date changes
  useEffect(() => {
    if (form.date) {
      getMoon(form.date).then(m => setMoonInfo({ illumination: m.illumination, phase_name: m.phase_name }))
    }
  }, [form.date])

  const saveMutation = useMutation({
    mutationFn: (data: Partial<typeof form>) =>
      isEdit ? updateObservation(Number(id), data) : createObservation(data),
    onSuccess: (obs) => {
      queryClient.invalidateQueries({ queryKey: ['observations'] })
      if (!draftId) setDraftId(obs.id)
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

  const handlePhotosUploaded = () => {
    if (draftId) {
      queryClient.invalidateQueries({ queryKey: ['observation', draftId] })
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        {isEdit ? 'Edit Session' : 'New Observation Session'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium mb-1">
              <Calendar className="w-4 h-4 text-gray-500" /> Date
            </label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Time (local)</label>
            <input
              type="time"
              value={form.time}
              onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
              className="w-full"
              required
            />
          </div>
        </div>

        {/* Moon indicator */}
        {moonInfo && (
          <div className="flex items-center gap-2 text-sm text-gray-400 bg-[hsl(220_15%_11%)] border border-[hsl(215_15%_18%)] rounded-lg px-3 py-2">
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
            <label className="text-sm font-medium">Field Notes</label>
            <VoiceInput onTranscript={handleVoiceTranscript} />
          </div>
          <textarea
            value={form.notes_text}
            onChange={e => setForm(f => ({ ...f, notes_text: e.target.value }))}
            placeholder="What did you observe? How did the session go? Equipment used? Conditions?"
            rows={5}
            className="w-full"
          />
        </div>

        {/* Sky Conditions */}
        <SeeingRating
          value={form.seeing_rating}
          onChange={v => setForm(f => ({ ...f, seeing_rating: v }))}
        />

        {/* Gear */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium mb-1">
            <Camera className="w-4 h-4 text-gray-500" /> Equipment
          </label>
          <input
            type="text"
            value={form.gear}
            onChange={e => setForm(f => ({ ...f, gear: e.target.value }))}
            placeholder="e.g. Seestar S50, 200mm f/5, ISO 1600, 60s"
            className="w-full"
          />
        </div>

        {/* Location */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium mb-1">
            <MapPin className="w-4 h-4 text-gray-500" /> Location
          </label>
          <input
            type="text"
            value={form.location}
            onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            placeholder="Aesch ZH"
            className="w-full"
          />
        </div>

        {/* Photo upload */}
        <PhotoDropzone
          observationId={draftId}
          onUploaded={handlePhotosUploaded}
          uploadedFiles={uploadedPhotos}
        />

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2 border-t border-[hsl(215_15%_18%)]">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="btn-primary"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'Save Changes' : 'Save Session'}
          </button>
          <button
            type="button"
            onClick={() => navigate(isEdit ? `/observations/${id}` : '/')}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
