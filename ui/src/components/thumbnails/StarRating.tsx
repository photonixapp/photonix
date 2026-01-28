import { useState, useCallback } from 'react'
import { Star } from 'lucide-react'

interface StarRatingProps {
  rating: number
  onRatingChange?: (rating: number) => void
  size?: 'sm' | 'lg'
  alwaysShow?: boolean
}

export function StarRating({
  rating,
  onRatingChange,
  size = 'sm',
  alwaysShow = false,
}: StarRatingProps) {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null)
  const [isHovering, setIsHovering] = useState(false)

  const displayRating = hoveredRating ?? rating
  const starSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5'
  const isVisible = alwaysShow || rating > 0 || isHovering

  const handleMouseEnter = useCallback(
    (index: number) => {
      if (onRatingChange) {
        setHoveredRating(index)
        setIsHovering(true)
      }
    },
    [onRatingChange]
  )

  const handleMouseLeave = useCallback(() => {
    setHoveredRating(null)
    setIsHovering(false)
  }, [])

  const handleClick = useCallback(
    (index: number, e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      if (onRatingChange) {
        onRatingChange(rating === index ? 0 : index)
      }
    },
    [rating, onRatingChange]
  )

  // Always render so hover area exists, but control visibility via opacity
  return (
    <div
      data-testid="star-rating"
      className={`flex gap-0.5 cursor-pointer transition-opacity duration-150 drop-shadow-[1px_1px_0px_black] ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onMouseLeave={handleMouseLeave}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${starSize} ${
            displayRating >= i
              ? 'fill-white text-white'
              : 'fill-transparent text-white/70'
          }`}
          onMouseEnter={() => handleMouseEnter(i)}
          onMouseDown={(e) => handleClick(i, e)}
        />
      ))}
    </div>
  )
}
