import { useState, useRef, useEffect, useCallback } from 'react'
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
  const [showUI, setShowUI] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const uiTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastTapTime = useRef(0)

  // Auto-hide UI after inactivity - define FIRST before any callbacks use it
  const resetUITimer = useCallback(() => {
    if (uiTimeoutRef.current) {
      clearTimeout(uiTimeoutRef.current)
    }
    setShowUI(true)
    uiTimeoutRef.current = setTimeout(() => {
      setShowUI(false)
    }, 3000)
  }, [])

  const goNext = useCallback(() => {
    setCurrentIndex(i => (i + 1) % photos.length)
    resetUITimer()
  }, [photos.length, resetUITimer])

  const goPrev = useCallback(() => {
    setCurrentIndex(i => (i - 1 + photos.length) % photos.length)
    resetUITimer()
  }, [photos.length, resetUITimer])

  if (!isOpen) return null

  const current = photos[currentIndex]

  // Handle tap to toggle UI
  const handleContainerClick = (e: React.MouseEvent | React.TouchEvent) => {
    // Don't toggle if clicking on buttons
    if ((e.target as HTMLElement).closest('button')) return
    
    const now = Date.now()
    const timeSinceLastTap = now - lastTapTime.current
    lastTapTime.current = now
    
    // Double tap detection (optional - could add zoom later)
    if (timeSinceLastTap < 300) {
      // Double tap - could zoom
      return
    }
    
    setShowUI(prev => !prev)
    if (!showUI) {
      resetUITimer()
    }
  }

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    setIsDragging(true)
    setDragOffset(0)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    
    const touchX = e.touches[0].clientX
    const touchY = e.touches[0].clientY
    const deltaX = touchX - touchStartX.current
    const deltaY = touchY - touchStartY.current
    
    // Only handle horizontal swipes (ignore vertical scrolling)
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault()
      setDragOffset(deltaX)
    }
  }

  const handleTouchEnd = () => {
    if (!isDragging) return
    setIsDragging(false)
    
    const threshold = 50 // Minimum swipe distance
    
    if (dragOffset > threshold) {
      goPrev()
    } else if (dragOffset < -threshold) {
      goNext()
    }
    
    setDragOffset(0)
    resetUITimer()
  }

  // Mouse drag handlers for desktop swipe
  const handleMouseDown = (e: React.MouseEvent) => {
    touchStartX.current = e.clientX
    setIsDragging(true)
    setDragOffset(0)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const deltaX = e.clientX - touchStartX.current
    setDragOffset(deltaX)
  }

  const handleMouseUp = () => {
    if (!isDragging) return
    setIsDragging(false)
    
    const threshold = 50
    
    if (dragOffset > threshold) {
      goPrev()
    } else if (dragOffset < -threshold) {
      goNext()
    }
    
    setDragOffset(0)
    resetUITimer()
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    if (e.key === 'ArrowRight') goNext()
    if (e.key === 'ArrowLeft') goPrev()
    resetUITimer()
  }

  // Start UI timer on open
  useEffect(() => {
    if (isOpen) {
      resetUITimer()
    }
    return () => {
      if (uiTimeoutRef.current) {
        clearTimeout(uiTimeoutRef.current)
      }
    }
  }, [isOpen, resetUITimer])

  // Reset index when opening
  useEffect(() => {
    setCurrentIndex(initialIndex)
  }, [initialIndex, isOpen])

  const imageStyle: React.CSSProperties = {
    transform: `translateX(${dragOffset}px)`,
    transition: isDragging ? 'none' : 'transform 0.3s ease-out',
    cursor: isDragging ? 'grabbing' : 'grab',
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center select-none"
      onClick={handleContainerClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className={`absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-all z-10 ${
          showUI ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <X className="w-6 h-6" />
      </button>

      {/* Navigation arrows */}
      {photos.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); goPrev() }}
            className={`absolute left-4 p-2 text-white/70 hover:text-white transition-all ${
              showUI ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'
            }`}
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); goNext() }}
            className={`absolute right-4 p-2 text-white/70 hover:text-white transition-all ${
              showUI ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'
            }`}
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}

      {/* Swipe hint (only on mobile, fades out) */}
      {photos.length > 1 && showUI && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none md:hidden">
          <div className="text-white/20 text-sm animate-pulse">
            Swipe to navigate
          </div>
        </div>
      )}

      {/* Image container */}
      <div
        className="max-w-[90vw] max-h-[85vh] flex flex-col items-center"
        onClick={e => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          src={current.url}
          alt={current.original_name || 'Observation photo'}
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
          style={imageStyle}
          draggable={false}
        />
        
        {/* Info bar */}
        <div 
          className={`mt-4 text-center text-white/80 transition-all ${
            showUI ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <p className="text-sm">
            {current.original_name || `Photo ${currentIndex + 1}`}
          </p>
          <p className="text-xs text-white/50 mt-1">
            {currentIndex + 1} / {photos.length}
          </p>
          <p className="text-xs text-white/30 mt-2">
            Tap to {showUI ? 'hide' : 'show'} controls
          </p>
        </div>
      </div>
    </div>
  )
}
