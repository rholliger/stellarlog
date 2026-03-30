import { useState, useEffect } from 'react'

interface LiveSkyInfo {
  currentTime: string
  isNight: boolean
  sunPosition: 'below' | 'rising' | 'above' | 'setting'
}

export function useLiveSky() {
  const [info, setInfo] = useState<LiveSkyInfo>({
    currentTime: new Date().toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }),
    isNight: false,
    sunPosition: 'below',
  })

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const hour = now.getHours()
      const isNight = hour < 6 || hour > 20
      
      let sunPosition: LiveSkyInfo['sunPosition'] = 'below'
      if (hour >= 5 && hour < 7) sunPosition = 'rising'
      else if (hour >= 7 && hour < 17) sunPosition = 'above'
      else if (hour >= 17 && hour < 20) sunPosition = 'setting'

      setInfo({
        currentTime: now.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }),
        isNight,
        sunPosition,
      })
    }

    update()
    const interval = setInterval(update, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])

  return info
}
