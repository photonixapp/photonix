import { ChevronLeft, ChevronRight } from 'lucide-react'

interface NavigationArrowsProps {
  onPrev: () => void
  onNext: () => void
  hasPrev: boolean
  hasNext: boolean
  visible: boolean
}

export function NavigationArrows({
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  visible,
}: NavigationArrowsProps) {
  return (
    <>
      {/* Previous arrow */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onPrev()
        }}
        disabled={!hasPrev}
        className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 text-white/70 hover:text-white transition-all duration-200 ${
          visible && hasPrev ? 'opacity-100' : 'opacity-0'
        } ${!hasPrev ? 'cursor-default' : ''}`}
        title="Previous photo (Left arrow)"
      >
        <ChevronLeft className="w-12 h-12" strokeWidth={1.5} />
      </button>

      {/* Next arrow */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onNext()
        }}
        disabled={!hasNext}
        className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 text-white/70 hover:text-white transition-all duration-200 ${
          visible && hasNext ? 'opacity-100' : 'opacity-0'
        } ${!hasNext ? 'cursor-default' : ''}`}
        title="Next photo (Right arrow)"
      >
        <ChevronRight className="w-12 h-12" strokeWidth={1.5} />
      </button>
    </>
  )
}
