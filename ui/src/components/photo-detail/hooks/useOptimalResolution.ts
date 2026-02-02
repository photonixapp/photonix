import { useState, useEffect } from 'react'
import { getOptimalResolution, type ThumbnailResolution } from '../../../lib/photos/image-cache-store'

/**
 * Hook that calculates the optimal image resolution based on viewport size and pixel density.
 * Returns '3840' (4K) if max(viewport width, height) * pixelRatio > 1920, else '1920' (2K).
 *
 * Updates when window is resized or pixel ratio changes (e.g., moving window between displays).
 */
export function useOptimalResolution(): ThumbnailResolution {
  const [resolution, setResolution] = useState<ThumbnailResolution>(() =>
    getOptimalResolution(window.innerWidth, window.innerHeight, window.devicePixelRatio)
  )

  useEffect(() => {
    const updateResolution = () => {
      const newResolution = getOptimalResolution(
        window.innerWidth,
        window.innerHeight,
        window.devicePixelRatio
      )
      setResolution(newResolution)
    }

    // Listen for window resize
    window.addEventListener('resize', updateResolution)

    // Listen for pixel ratio changes (e.g., moving to different display)
    const mediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
    const handleMediaChange = () => updateResolution()
    mediaQuery.addEventListener('change', handleMediaChange)

    return () => {
      window.removeEventListener('resize', updateResolution)
      mediaQuery.removeEventListener('change', handleMediaChange)
    }
  }, [])

  return resolution
}
