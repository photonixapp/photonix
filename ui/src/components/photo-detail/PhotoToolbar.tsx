import {
  ArrowLeft,
  RotateCcw,
  RotateCw,
  Download,
  Info,
  X,
} from 'lucide-react'

interface PhotoToolbarProps {
  onBack: () => void
  onRotateCW: () => void
  onRotateCCW: () => void
  downloadUrl: string | null
  showInfo: boolean
  onToggleInfo: () => void
}

export function PhotoToolbar({
  onBack,
  onRotateCW,
  onRotateCCW,
  downloadUrl,
  showInfo,
  onToggleInfo,
}: PhotoToolbarProps) {
  return (
    <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-3">
      {/* Left side - Back button */}
      <button
        onClick={onBack}
        className="p-2 text-white/90 hover:text-white transition-colors cursor-pointer"
        title="Press [Esc] to go back"
      >
        <ArrowLeft className="w-7 h-7" />
      </button>

      {/* Right side - Action icons */}
      <div className="flex items-center gap-1">
        <button
          onClick={onRotateCCW}
          className="p-2 text-white/90 hover:text-white transition-colors cursor-pointer"
          title="Rotate counter-clockwise"
        >
          <RotateCcw className="w-6 h-6" />
        </button>

        <button
          onClick={onRotateCW}
          className="p-2 text-white/90 hover:text-white transition-colors cursor-pointer"
          title="Rotate clockwise"
        >
          <RotateCw className="w-6 h-6" />
        </button>

        {downloadUrl && (
          <a
            href={downloadUrl}
            download
            className="p-2 text-white/90 hover:text-white transition-colors cursor-pointer"
            title="Download original"
          >
            <Download className="w-6 h-6" />
          </a>
        )}

        <button
          onClick={onToggleInfo}
          className="p-2 text-white/90 hover:text-white transition-colors cursor-pointer ml-3"
          title="Press [I] to toggle info panel"
        >
          {showInfo ? (
            <X className="w-6 h-6" />
          ) : (
            <Info className="w-6 h-6" />
          )}
        </button>
      </div>
    </div>
  )
}
