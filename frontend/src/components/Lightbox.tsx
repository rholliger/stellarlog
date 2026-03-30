import { useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface Photo {
  id: number
  url: string
  original_name: string | null
}

interface LightboxProps {
  photos: Photo[]
  initialIndex: number
  isOpen: boolean
  onClose: () => void
}

export function Lightbox({ photos, initialIndex, isOpen, onClose }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  if (!isOpen) return null

  const current = photos[currentIndex]
  const hasExif = false // TODO: Add EXIF data to photos

  const goNext = () => setCurrentIndex(i => (i + 1) % photos.length)
  const goPrev = () => setCurrentIndex(i => (i - 1 + photos.length) % photos.length)

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    if (e.key === 'ArrowRight') goNext()
    if (e.key === 'ArrowLeft') goPrev()
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors z-10"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Navigation */}
      {photos.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); goPrev() }}
            className="absolute left-4 p-2 text-white/70 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); goNext() }}
            className="absolute right-4 p-2 text-white/70 hover:text-white transition-colors"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}

      {/* Image */}
      <div
        className="max-w-[90vw] max-h-[85vh] flex flex-col items-center"
        onClick={e => e.stopPropagation()}
      >
        <img
          src={current.url}
          alt={current.original_name || 'Observation photo'}
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
        />
        
        {/* Info bar */}
        <div className="mt-4 text-center text-white/80">
          <p className="text-sm">
            {current.original_name || `Photo ${currentIndex + 1}`}
          </p>
          <p className="text-xs text-white/50 mt-1">
            {currentIndex + 1} / {photos.length}
          </p>
        </div>
      </div>
    </div>
  )
}
