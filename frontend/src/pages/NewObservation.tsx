import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import {
  getObservation, createObservation, updateObservation,
  uploadPhoto, getAllTargets, transcribe, getMoon,
} from '@/lib/api'
import { format } from 'date-fns'
import { useToast } from '@/components/Toast'
import { useDraft } from '@/hooks/useDraft'
import { useClickOutside } from '@/hooks/useClickOutside'
import {
  Mic, MicOff, Upload, X, Star, MapPin, Calendar,
  Moon as MoonIcon, Camera, Save, Loader2, RotateCcw,
} from 'lucide-react'

const BASE_GEAR_TAGS = [
  'Seestar S50',
  'Solar Filter',
  'EQ Mount',
  'Dew Lens',
  'LP Filter',
]

function getCustomTags(): string[] {
  try {
    const stored = localStorage.getItem('stellarlog_gear_tags')
    return stored ? JSON.parse(stored) : []
  } catch { return [] }
}

function saveCustomTags(tags: string[]) {
  localStorage.setItem('stellarlog_gear_tags', JSON.stringify(tags))
}

function TagInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [customTags, setCustomTags] = useState<string[]>(getCustomTags)
  const selected = value ? value.split(',').map(s => s.trim()).filter(Boolean) : []
  const dropdownRef = useClickOutside<HTMLDivElement>(() => setOpen(false), open)

  const allTags = [...BASE_GEAR_TAGS, ...customTags]
  const filtered = allTags.filter(
    t => !selected.includes(t) && t.toLowerCase().includes(search.toLowerCase())
  )

  const addTag = (tag: string) => {
    const updated = [...selected, tag]
    onChange(updated.join(', '))
    setSearch('')
    setOpen(false)
  }

  const addCustomTag = () => {
    const tag = search.trim()
    if (!tag || selected.includes(tag)) return
    const updated = [...selected, tag]
    const newCustom = [...customTags, tag]
    setCustomTags(newCustom)
    saveCustomTags(newCustom)
    onChange(updated.join(', '))
    setSearch('')
    setOpen(false)
  }

  const removeTag = (tag: string) => {
    onChange(selected.filter(t => t !== tag).join(', '))
  }

  return (
    <div ref={dropdownRef}>
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
        {selected.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/15 text-blue-300 text-xs rounded-full border border-blue-500/30 animate-in fade-in">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-400 transition-colors">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {selected.length === 0 && (
          <span className="text-xs text-gray-600">Type to search or add custom tags…</span>
        )}
      </div>
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (filtered.length > 0) addTag(filtered[0])
              else if (search.trim()) addCustomTag()
            }
            if (e.key === 'Escape') setOpen(false)
          }}
          placeholder="Search or type + Enter to add custom…"
          className="w-full bg-[hsl(220_15%_11%)] border border-[hsl(215_15%_22%)] rounded-lg px-3 py-2 text-sm focus:border-blue-500/50 focus:outline-none transition-colors"
        />
        {open && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg shadow-xl max-h-40 overflow-y-auto bg-[hsl(220_15%_11%)] border border-[hsl(215_15%_22%)]">
            {filtered.map(tag => (
              <button
                key={tag}
                type="button"
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-[hsl(220_15%_18%)] text-gray-300 transition-colors"
                onClick={() => addTag(tag)}
              >
                {tag}
                {!BASE_GEAR_TAGS.includes(tag) && <span className="ml-1 text-xs text-gray-600">custom</span>}
              </button>
            ))}
            {search.trim() && !allTags.map(t => t.toLowerCase()).includes(search.toLowerCase()) && (
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 text-sm text-blue-400 hover:bg-[hsl(220_15%_18%)] border-t border-[hsl(215_15%_18%)] transition-colors"
                onClick={addCustomTag}
              >
                + Add &quot;{search.trim()}&quot; as custom tag
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function TargetSelector({ value, onChange }: { value: string; onChange: (id: string, name: string) => void }) {
  const { data: targets } = useQuery({ queryKey: ['targets', 'all'], queryFn: getAllTargets })
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useClickOutside<HTMLDivElement>(() => setOpen(false), open)

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
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium mb-1">Target *</label>
      <input
        type="text"
        value={open ? search : (selected ? `${selected.catalog_id} — ${selected.name || selected.common_name}` : value)}
        onFocus={() => setOpen(true)}
        onChange={e => { setSearch(e.target.value); setOpen(true) }}
        onKeyDown={e => { if (e.key === 'Escape') setOpen(false) }}
        placeholder="Search M42, NGC 224, C1…"
        className="w-full bg-[hsl(220_15%_11%)] border border-[hsl(215_15%_22%)] rounded-lg px-3 py-2 text-sm focus:border-blue-500/50 focus:outline-none transition-colors"
        required
      />
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg shadow-xl max-h-60 overflow-y-auto bg-[hsl(220_15%_11%)] border border-[hsl(215_15%_22%)]">
          {(filtered || []).slice(0, 50).map(t => (
            <button
              key={`${t.source_catalog}-${t.catalog_id}`}
              className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(220_15%_18%)] flex items-center justify-between transition-colors"
              onClick={() => {
                onChange(`${t.source_catalog || ''} ${t.catalog_id}`.trim(), t.name || t.common_name || t.catalog_id)
                setOpen(false)
                setSearch('')
              }}
            >
              <span>
                <span className="font-mono text-blue-400 mr-1">{t.catalog_id}</span>
                <span className="text-gray-300">{t.name || t.common_name}</span>
                {t.type && <span className="text-gray-600 ml-2 text-xs">{t.type}</span>}
              </span>
              <span className="text-xs text-gray-600">{t.constellation}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function VoiceInput({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [recording, setRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

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
        } catch { console.error('Transcription failed') }
        stream.getTracks().forEach(t => t.stop())
      }
      media.start()
      setRecording(true)
      setDuration(0)
      intervalRef.current = setInterval(() => setDuration(d => d + 1), 1000)
    } catch { console.error('Microphone access denied') }
  }

  const stopRecording = () => {
    mediaRef.current?.stop()
    setRecording(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <button
      type="button"
      onClick={recording ? stopRecording : startRecording}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all ${
        recording
          ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
          : 'bg-[hsl(220_15%_14%)] hover:bg-[hsl(220_15%_18%)] text-gray-400 border border-[hsl(215_15%_22%)]'
      }`}
    >
      {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      {recording ? `Stop (${formatDuration(duration)})` : 'Voice'}
    </button>
  )
}

interface LocalPreview { id: string; file: File; url: string; uploading: boolean }

function PhotoDropzone({ observationId, onUploaded }: { observationId: number | null; onUploaded: () => void }) {
  const [previews, setPreviews] = useState<LocalPreview[]>([])

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      previews.forEach(pv => URL.revokeObjectURL(pv.url))
    }
  }, [])

  const uploadFile = useCallback(async (file: File, previewId: string) => {
    if (!observationId) return
    try {
      await uploadPhoto(observationId, file)
      setPreviews(p => p.map(pv => pv.id === previewId ? { ...pv, uploading: false } : pv))
      onUploaded()
    } catch {
      setPreviews(p => p.filter(pv => pv.id !== previewId))
    }
  }, [observationId, onUploaded])

  const onDrop = useCallback((files: File[]) => {
    const newPreviews: LocalPreview[] = files.map(file => ({
      id: Math.random().toString(36).slice(2),
      file,
      url: URL.createObjectURL(file),
      uploading: true,
    }))
    setPreviews(p => [...p, ...newPreviews])
    if (observationId) {
      newPreviews.forEach(p => uploadFile(p.file, p.id))
    }
  }, [observationId, uploadFile])

  const removePreview = (id: string) => {
    const preview = previews.find(p => p.id === id)
    if (preview) URL.revokeObjectURL(preview.url)
    setPreviews(p => p.filter(pv => pv.id !== id))
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [] } })

  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-medium mb-2">
        <Camera className="w-4 h-4 text-gray-500" />
        Photos
        {previews.length > 0 && <span className="text-xs text-gray-600 font-normal">({previews.length})</span>}
      </label>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
          isDragActive ? 'border-blue-500 bg-blue-500/5 scale-[1.02]' : 'border-[hsl(215_15%_22%)] hover:border-[hsl(215_15%_30%)] bg-[hsl(220_15%_11%)]'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-6 h-6 mx-auto mb-1 text-gray-500" />
        <p className="text-xs text-gray-500">{isDragActive ? 'Drop photos here' : 'Drag & drop or click to select'}</p>
      </div>
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {previews.map(pv => (
            <div key={pv.id} className="relative w-16 h-16 rounded-lg overflow-hidden border border-[hsl(215_15%_22%)] group">
              <img src={pv.url} alt="preview" className="w-full h-full object-cover" />
              {pv.uploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                </div>
              )}
              <button
                type="button"
                onClick={() => removePreview(pv.id)}
                className="absolute top-0 right-0 p-0.5 bg-black/70 rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
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
              className={`text-xl transition-all hover:scale-110 ${n <= value ? 'text-yellow-400' : 'text-gray-700'}`}
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
  const [searchParams] = useSearchParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const initialForm = {
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    target_catalog_id: searchParams.get('target') || '',
    target_name: searchParams.get('name') || '',
    notes_text: '',
    seeing_rating: 3,
    location: 'Aesch ZH',
    gear: '',
  }

  const { draft, setDraft, hasDraft, saveDraft, clearDraft } = useDraft(
    isEdit ? `edit-${id}` : 'new',
    initialForm
  )

  const [form, setForm] = useState(draft)
  const [moonInfo, setMoonInfo] = useState<{ illumination: number; phase_name: string } | null>(null)
  const [draftId, setDraftId] = useState<number | null>(isEdit ? Number(id) : null)
  const [showDraftNotice, setShowDraftNotice] = useState(hasDraft && !isEdit)

  const { data: existing } = useQuery({
    queryKey: ['observation', id],
    queryFn: () => getObservation(Number(id)),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existing) {
      const existingForm = {
        date: existing.date,
        time: existing.time,
        target_catalog_id: existing.target_catalog_id || '',
        target_name: existing.target_name,
        notes_text: existing.notes_text || '',
        seeing_rating: existing.seeing_rating || 3,
        location: existing.location,
        gear: existing.gear || '',
      }
      setForm(existingForm)
      setDraftId(existing.id)
    }
  }, [existing])

  useEffect(() => {
    if (form.date) {
      getMoon(form.date).then(m => setMoonInfo({ illumination: m.illumination, phase_name: m.phase_name }))
    }
  }, [form.date])

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (!isEdit) {
      const interval = setInterval(() => {
        saveDraft(form)
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [form, isEdit, saveDraft])

  const saveMutation = useMutation({
    mutationFn: (data: Partial<typeof form>) =>
      isEdit ? updateObservation(Number(id), data) : createObservation(data),
    onSuccess: (obs) => {
      queryClient.invalidateQueries({ queryKey: ['observations'] })
      clearDraft()
      showToast(isEdit ? 'Observation updated' : 'Observation saved', 'success')
      navigate(`/observations/${obs.id}`)
    },
    onError: () => {
      showToast('Failed to save observation', 'error')
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

  const restoreDraft = () => {
    setForm(draft)
    setShowDraftNotice(false)
    showToast('Draft restored', 'info')
  }

  const discardDraft = () => {
    clearDraft()
    setShowDraftNotice(false)
    setForm(initialForm)
    showToast('Draft discarded', 'info')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-start justify-between mb-2">
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit Session' : 'New Observation Session'}</h1>
      </div>
      
      {/* Sky Check shortcut - only show for new sessions */}
      {!isEdit && (
        <div className="mb-4">
          <button
            onClick={() => navigate('/sky-check')}
            className="text-sm text-gray-500 hover:text-blue-400 transition-colors flex items-center gap-1"
          >
            Just checking conditions? Log sky conditions instead →
          </button>
        </div>
      )}

      {/* Draft notice */}
      {showDraftNotice && (
        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center justify-between">
          <span className="text-sm text-blue-300">You have an unsaved draft from earlier</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={restoreDraft}
              className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors"
            >
              Restore
            </button>
            <button
              type="button"
              onClick={discardDraft}
              className="text-xs px-2 py-1 text-gray-500 hover:text-gray-300 transition-colors"
            >
              Discard
            </button>
          </div>
        </div>
      )}

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
              className="w-full bg-[hsl(220_15%_11%)] border border-[hsl(215_15%_22%)] rounded-lg px-3 py-2 text-sm focus:border-blue-500/50 focus:outline-none transition-colors"
              required
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium mb-1">
              <span className="w-4 h-4 flex items-center justify-center text-gray-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </span>
              Time
            </label>
            <input
              type="time"
              value={form.time}
              onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
              className="w-full bg-[hsl(220_15%_11%)] border border-[hsl(215_15%_22%)] rounded-lg px-3 py-2 text-sm focus:border-blue-500/50 focus:outline-none transition-colors"
              required
            />
          </div>
        </div>

        {/* Moon phase */}
        {moonInfo && (
          <div className="flex items-center gap-2 text-sm text-gray-400 bg-[hsl(220_15%_10%)] rounded-lg px-3 py-2 border border-[hsl(215_15%_18%)]">
            <MoonIcon className="w-4 h-4 text-blue-400" />
            Moon phase: {moonInfo.phase_name} — {Math.round(moonInfo.illumination * 100)}% illuminated
          </div>
        )}

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
            className="w-full bg-[hsl(220_15%_11%)] border border-[hsl(215_15%_22%)] rounded-lg px-3 py-2 text-sm focus:border-blue-500/50 focus:outline-none transition-colors resize-y"
          />
          <div className="text-xs text-gray-600 mt-1 text-right">{form.notes_text?.length || 0} chars</div>
        </div>

        <SeeingRating value={form.seeing_rating} onChange={v => setForm(f => ({ ...f, seeing_rating: v }))} />

        {/* Equipment */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium mb-1">
            <Camera className="w-4 h-4 text-gray-500" /> Equipment
          </label>
          <TagInput value={form.gear} onChange={v => setForm(f => ({ ...f, gear: v }))} />
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
            className="w-full bg-[hsl(220_15%_11%)] border border-[hsl(215_15%_22%)] rounded-lg px-3 py-2 text-sm focus:border-blue-500/50 focus:outline-none transition-colors"
          />
        </div>

        {/* Photos */}
        <PhotoDropzone
          observationId={draftId}
          onUploaded={() => { if (draftId) queryClient.invalidateQueries({ queryKey: ['observation', draftId] }) }}
        />

        {/* Submit */}
        <div className="flex items-center gap-3 pt-4 border-t border-[hsl(215_15%_18%)]">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'Save Changes' : 'Save Session'}
          </button>
          <button
            type="button"
            onClick={() => { if (isEdit) navigate(`/observations/${id}`); else navigate('/journal') }}
            className="px-4 py-2 text-gray-400 hover:text-gray-300 transition-colors"
          >
            Cancel
          </button>
          {!isEdit && (
            <button
              type="button"
              onClick={() => { saveDraft(form); showToast('Draft saved', 'success') }}
              className="ml-auto flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Save Draft
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
