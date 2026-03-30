import { useState, useEffect, useCallback } from 'react'

interface DraftData {
  form: Record<string, unknown>
  timestamp: number
}

const DRAFT_KEY = 'stellarlog_draft'
const DRAFT_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours

export function useDraft<T extends Record<string, unknown>>(key: string, initialData: T) {
  const storageKey = `${DRAFT_KEY}_${key}`
  
  const [draft, setDraft] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed: DraftData = JSON.parse(saved)
        if (Date.now() - parsed.timestamp < DRAFT_EXPIRY) {
          return { ...initialData, ...parsed.form }
        }
        localStorage.removeItem(storageKey)
      }
    } catch {}
    return initialData
  })

  const [hasDraft, setHasDraft] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed: DraftData = JSON.parse(saved)
        return Date.now() - parsed.timestamp < DRAFT_EXPIRY
      }
    } catch {}
    return false
  })

  const saveDraft = useCallback((data: T) => {
    const draftData: DraftData = {
      form: data,
      timestamp: Date.now(),
    }
    localStorage.setItem(storageKey, JSON.stringify(draftData))
    setHasDraft(true)
    setDraft(data)
  }, [storageKey])

  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey)
    setHasDraft(false)
    setDraft(initialData)
  }, [storageKey, initialData])

  const restoreDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed: DraftData = JSON.parse(saved)
        if (Date.now() - parsed.timestamp < DRAFT_EXPIRY) {
          setDraft({ ...initialData, ...parsed.form })
          return true
        }
      }
    } catch {}
    return false
  }, [storageKey, initialData])

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (hasDraft) {
        saveDraft(draft)
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [draft, hasDraft, saveDraft])

  return { draft, setDraft, hasDraft, saveDraft, clearDraft, restoreDraft }
}
