import { Maximize, Minimize } from 'lucide-react'
import { useFullscreen } from './hooks/useFullscreen'

export function FullscreenButton() {
  const { isFullscreen, toggleFullscreen } = useFullscreen()

  return (
    <button
      onClick={toggleFullscreen}
      className="absolute bottom-4 right-4 z-20 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white/80 hover:text-white transition-colors"
      title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
    >
      {isFullscreen ? (
        <Minimize className="w-5 h-5" />
      ) : (
        <Maximize className="w-5 h-5" />
      )}
    </button>
  )
}
