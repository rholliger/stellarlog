interface VisibilityBarProps {
  riseTime: string | null
  setTime: string | null
  transitTime: string | null
  currentTime?: string
}

export function VisibilityBar({ riseTime, setTime, transitTime, currentTime }: VisibilityBarProps) {
  if (!riseTime || !setTime) {
    return (
      <div className="text-xs text-gray-500 italic">
        Below horizon tonight
      </div>
    )
  }

  // Parse times to minutes for positioning
  const parseTime = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }

  const rise = parseTime(riseTime)
  const set = parseTime(setTime)
  const transit = transitTime ? parseTime(transitTime) : (rise + set) / 2
  const current = currentTime ? parseTime(currentTime) : null

  // Normalize to 0-100% of visibility window
  const totalWindow = set - rise
  const transitPos = ((transit - rise) / totalWindow) * 100
  const currentPos = current ? ((current - rise) / totalWindow) * 100 : null

  return (
    <div className="mt-3">
      {/* Timeline bar */}
      <div className="relative h-2 bg-[hsl(220_15%_14%)] rounded-full overflow-hidden">
        {/* Visible window */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 via-green-500/40 to-blue-500/30" />
        
        {/* Transit marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-yellow-400"
          style={{ left: `${transitPos}%` }}
        />
        
        {/* Current time marker */}
        {currentPos !== null && currentPos >= 0 && currentPos <= 100 && (
          <div
            className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
            style={{ left: `${currentPos}%` }}
          />
        )}
      </div>
      
      {/* Labels */}
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{riseTime}</span>
        {transitTime && <span className="text-yellow-400/70">Transit {transitTime}</span>}
        <span>{setTime}</span>
      </div>
    </div>
  )
}
