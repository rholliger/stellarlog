import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

export interface Observation {
  id: number
  date: string
  time: string
  target_name: string
  target_catalog_id: string | null
  notes_text: string | null
  notes_voice_path: string | null
  moon_phase: number | null
  moon_phase_name: string | null
  weather_json: string | null
  seeing_rating: number | null
  location: string
  gear: string | null
  photos: Photo[]
  created_at: string
  updated_at: string
}

export interface Photo {
  id: number
  observation_id: number
  filename: string
  original_name: string | null
  caption: string | null
  file_size: number | null
  mime_type: string | null
  url: string
}

export interface Target {
  id?: number
  catalog_id: string
  name: string | null
  common_name?: string | null
  type: string | null
  ra_hours: number | null
  dec_deg: number | null
  constellation: string | null
  magnitude: number | null
  size_arcmin: number | null
  description: string | null
  source_catalog?: string
}

export interface MoonInfo {
  date: string
  illumination: number
  phase_name: string
}

export interface VisibilityInfo {
  target_name: string
  catalog_id: string | null
  date: string
  altitude: number
  max_altitude: number
  transit_time: string
  transit_altitude: number
  rise_time: string | null
  set_time: string | null
  is_visible: boolean
  best_window: string | null
  constellation: string | null
}

// Sky Check
export interface SkyCheck {
  id: number
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
  notes: string | null
  created_at: string
}

// Observations
export const listObservations = (params?: { limit?: number; target?: string }) =>
  api.get<Observation[]>('/observations', { params }).then(r => r.data)

export const getObservation = (id: number) =>
  api.get<Observation>(`/observations/${id}`).then(r => r.data)

export const createObservation = (data: Partial<Observation>) =>
  api.post<Observation>('/observations', data).then(r => r.data)

export const updateObservation = (id: number, data: Partial<Observation>) =>
  api.put<Observation>(`/observations/${id}`, data).then(r => r.data)

export const deleteObservation = (id: number) =>
  api.delete(`/observations/${id}`).then(r => r.data)

// Photos
export const uploadPhoto = (obsId: number, file: File) => {
  const form = new FormData()
  form.append('file', file)
  return api.post<Photo>(`/observations/${obsId}/photos`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}

// Targets
export const getAllTargets = () =>
  api.get<Target[]>('/targets/all').then(r => r.data)

export const searchTargets = (q: string) =>
  api.get<Target[]>('/targets/search', { params: { q } }).then(r => r.data)

// Astronomy
export const getMoon = (date: string) =>
  api.get<MoonInfo>('/astronomy/moon', { params: { date } }).then(r => r.data)

export const getTonightAstronomy = () =>
  api.get('/astronomy/tonight').then(r => r.data)

export const getMoonPhaseForDate = (date: string) =>
  api.get('/astronomy/moon', { params: { date } }).then(r => r.data)

export const getVisibility = (catalogId: string, date: string) =>
  api.get<VisibilityInfo>('/astronomy/visibility', { params: { catalog_id: catalogId, date } }).then(r => r.data)

export const getBestTonight = (limit = 10) =>
  api.get<Target[]>('/astronomy/best-tonight', { params: { limit, visible_only: true, min_altitude: 20 } }).then(r => r.data)

// Weather
export const getWeather = () =>
  api.get('/weather').then(r => r.data)

export const getForecast = () =>
  api.get('/weather/forecast').then(r => r.data)

// Sky Checks
export const listSkyChecks = (params?: { limit?: number; date?: string }) =>
  api.get<SkyCheck[]>('/sky-checks', { params }).then(r => r.data)

export const getSkyCheck = (id: number) =>
  api.get<SkyCheck>(`/sky-checks/${id}`).then(r => r.data)

export const createSkyCheck = (data: Partial<SkyCheck>) =>
  api.post<SkyCheck>('/sky-checks', data).then(r => r.data)

export const updateSkyCheck = (id: number, data: Partial<SkyCheck>) =>
  api.put<SkyCheck>(`/sky-checks/${id}`, data).then(r => r.data)

export const deleteSkyCheck = (id: number) =>
  api.delete(`/sky-checks/${id}`).then(r => r.data)

// Transcription
export const transcribe = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return api.post<{ transcript: string }>('/transcribe', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}

// Caption generation
export const generateCaption = (targetName: string, notes: string, conditions: string) =>
  api.post<{ caption: string }>('/generate/caption', null, {
    params: { target_name: targetName, notes, conditions },
  }).then(r => r.data)

export default api
