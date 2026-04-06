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
  const [direction, setDirection] = useState(0) // -1 for prev, 1 for next
  
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)
  const uiTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Reset index when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex)
      setShowUI(true)
      resetUITimer()
    }
  }, [isOpen, initialIndex])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (uiTimeoutRef.current) {
        clearTimeout(uiTimeoutRef.current)
      }
    }
  }, [])

  // Early return AFTER all hooks
  if (!isOpen || photos.length === 0) return null

  const current = photos[currentIndex]
  const hasMultiple = photos.length > 1

  // Auto-hide UI after inactivity
  const resetUITimer = useCallback(() => {
    if (uiTimeoutRef.current) {
      clearTimeout(uiTimeoutRef.current)
    }
    uiTimeoutRef.current = setTimeout(() => {
      setShowUI(false)
    }, 3000)
  }, [])

  const goNext = useCallback(() => {
    if (!hasMultiple) return
    setDirection(1)
    setCurrentIndex(i => (i + 1) % photos.length)
    setDragOffset(0)
    resetUITimer()
  }, [hasMultiple, photos.length, resetUITimer])

  const goPrev = useCallback(() => {
    if (!hasMultiple) return
    setDirection(-1)
    setCurrentIndex(i => (i - 1 + photos.length) % photos.length)
    setDragOffset(0)
    resetUITimer()
  }, [hasMultiple, photos.length, resetUITimer])

  // Toggle UI on tap
  const handleTap = () => {
    setShowUI(prev => {
      const next = !prev
      if (next) resetUITimer()
      return next
    })
  }

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!hasMultiple) return
    touchStartX.current = e.touches[0].clientX
    setIsDragging(true)
    setDragOffset(0)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !hasMultiple) return
    
    const touchX = e.touches[0].clientX
    const deltaX = touchX - touchStartX.current
    
    // Add resistance at edges
    const resistance = 0.8
    setDragOffset(deltaX * resistance)
  }

  const handleTouchEnd = () => {
    if (!isDragging || !hasMultiple) return
    setIsDragging(false)
    
    const threshold = 80
    const velocity = dragOffset
    
    if (velocity > threshold) {
      goPrev()
    } else if (velocity < -threshold) {
      goNext()
    } else {
      // Snap back
      setDragOffset(0)
    }
    
    resetUITimer()
  }

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!hasMultiple) return
    e.preventDefault()
    touchStartX.current = e.clientX
    setIsDragging(true)
    setDragOffset(0)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !hasMultiple) return
    e.preventDefault()
    const deltaX = e.clientX - touchStartX.current
    setDragOffset(deltaX * 0.8)
  }

  const handleMouseUp = () => {
    if (!isDragging || !hasMultiple) return
    setIsDragging(false)
    
    const threshold = 80
    
    if (dragOffset > threshold) {
      goPrev()
    } else if (dragOffset < -threshold) {
      goNext()
    } else {
      setDragOffset(0)
    }
    
    resetUITimer()
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    if (e.key === 'ArrowRight') goNext()
    if (e.key === 'ArrowLeft') goPrev()
    resetUITimer()
  }

  // Calculate transforms for current and adjacent images
  const getImageStyle = (index: number): React.CSSProperties => {
    const isCurrent = index === currentIndex
    const isPrev = index === (currentIndex - 1 + photos.length) % photos.length
    const isNext = index === (currentIndex + 1) % photos.length
    
    if (!isCurrent && !isPrev && !isNext) {
      return { display: 'none' }
    }

    let translateX = 0
    let opacity = 1
    let zIndex = 1

    if (isCurrent) {
      translateX = dragOffset
      zIndex = 10
      if (Math.abs(dragOffset) > 50) {
        opacity = 1 - Math.min(Math.abs(dragOffset) / 300, 0.5)
      }
    } else if (isPrev) {
      translateX = dragOffset - window.innerWidth * 0.85
      if (dragOffset > 0) {
        translateX += window.innerWidth * 0.85
        opacity = Math.min(dragOffset / 200, 1)
        zIndex = 5
      } else {
        opacity = 0
      }
    } else if (isNext) {
      translateX = dragOffset + window.innerWidth * 0.85
      if (dragOffset < 0) {
        translateX -= window.innerWidth * 0.85
        opacity = Math.min(Math.abs(dragOffset) / 200, 1)
        zIndex = 5
      } else {
        opacity = 0
      }
    }

    return {
      transform: `translateX(${translateX}px)`,
      opacity,
      zIndex,
      transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
      position: 'absolute' as const,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Top bar with close button */}
      <div 
        className={`absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-4 transition-all duration-300 ${
          showUI ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'
        }`}
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)' }}
      >
        <div className="text-white/80 text-sm">
          {currentIndex + 1} / {photos.length}
        </div>
        <button
          onClick={onClose}
          className="p-2 text-white/70 hover:text-white transition-colors rounded-full hover:bg-white/10"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main image area with tap handler */}
      <div 
        className="flex-1 relative overflow-hidden"
        onClick={handleTap}
        ref={imageContainerRef}
      >
        {/* Navigation arrows - positioned outside image area */}
        {hasMultiple && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              className={`absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all duration-300 ${
                showUI ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'
              }`}
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className={`absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all duration-300 ${
                showUI ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'
              }`}
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </>
        )}

        {/* Images container */}
        <div 
          className="absolute inset-0 flex items-center justify-center"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              style={getImageStyle(index)}
            >
              <img
                src={photo.url}
                alt={photo.original_name || `Photo ${index + 1}`}
                className="max-w-[85vw] max-h-[75vh] object-contain rounded-lg shadow-2xl select-none"
                draggable={false}
                style={{ cursor: isDragging ? 'grabbing' : hasMultiple ? 'grab' : 'default' }}
              />
            </div>
          ))}
        </div>

        {/* Swipe hint */}
        {hasMultiple && showUI && !isDragging && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-none md:hidden">
            <div className="text-white/30 text-xs animate-pulse bg-black/50 px-3 py-1.5 rounded-full">
              Swipe to navigate · Tap to hide
            </div>
          </div>
        )}
      </div>

      {/* Bottom info bar */}
      <div 
        className={`absolute bottom-0 left-0 right-0 z-30 p-4 transition-all duration-300 ${
          showUI ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'
        }`}
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)' }}
      >
        <div className="text-center text-white/80">
          <p className="text-sm font-medium">
            {current.original_name || `Photo ${currentIndex + 1}`}
          </p>
          <p className="text-xs text-white/50 mt-1">
            Tap image to {showUI ? 'hide' : 'show'} controls
          </p>
        </div>
      </div>
    </div>
  )
}
