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
  const [direction, setDirection] = useState(0)
  
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)
  const uiTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Check if we should render - but DON'T return early (hooks must run)
  const shouldRender = isOpen && photos.length > 0
  const current = shouldRender ? photos[currentIndex] : null
  const hasMultiple = photos.length > 1

  // Define all callbacks FIRST (before any effects that use them)
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

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex)
      setShowUI(true)
      setDragOffset(0)
      setIsDragging(false)
      resetUITimer()
    }
  }, [isOpen, initialIndex, resetUITimer])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (uiTimeoutRef.current) {
        clearTimeout(uiTimeoutRef.current)
      }
    }
  }, [])

  // NOW we can return null if not rendering
  if (!shouldRender) return null

  // Event handlers
  const handleTap = () => {
    setShowUI(prev => {
      const next = !prev
      if (next) resetUITimer()
      return next
    })
  }

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
      setDragOffset(0)
    }
    
    resetUITimer()
  }

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    if (e.key === 'ArrowRight') goNext()
    if (e.key === 'ArrowLeft') goPrev()
    resetUITimer()
  }

  // Calculate transforms for images - simplified natural swipe
  const getImageStyle = (index: number): React.CSSProperties => {
    const diff = index - currentIndex
    
    // Only render current, prev, and next
    if (Math.abs(diff) > 1) {
      return { display: 'none' }
    }

    // Base position: current is 0, prev is -100%, next is +100%
    let translateX = diff * 100 // percentage
    
    // Add drag offset for current image
    if (diff === 0) {
      translateX = (dragOffset / window.innerWidth) * 100
    }

    return {
      transform: `translateX(${translateX}%)`,
      opacity: Math.abs(diff) === 1 && Math.abs(dragOffset) < 50 ? 0.3 : 1,
      zIndex: diff === 0 ? 10 : 5,
      transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      position: 'absolute' as const,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      willChange: 'transform',
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

      {/* Main image area */}
      <div 
        className="flex-1 relative overflow-hidden"
        onClick={handleTap}
        ref={imageContainerRef}
      >
        {/* Navigation arrows with shadow for visibility on white images */}
        {hasMultiple && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              className={`absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 p-2 transition-all duration-300 ${
                showUI ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'
              }`}
              style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.8))' }}
            >
              <div className="p-2 bg-black/40 rounded-full text-white/90 hover:bg-black/60 hover:text-white transition-colors">
                <ChevronLeft className="w-8 h-8" />
              </div>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className={`absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 p-2 transition-all duration-300 ${
                showUI ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'
              }`}
              style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.8))' }}
            >
              <div className="p-2 bg-black/40 rounded-full text-white/90 hover:bg-black/60 hover:text-white transition-colors">
                <ChevronRight className="w-8 h-8" />
              </div>
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
            {current?.original_name || `Photo ${currentIndex + 1}`}
          </p>
        </div>
      </div>
    </div>
  )
}
