import { useState, useEffect, useRef, memo } from 'react'
import { useMutation } from '@apollo/client/react'
import { Check } from 'lucide-react'
import { StarRating } from './StarRating'
import { UPDATE_PHOTO_RATING } from '../../lib/photos/graphql'
import type { ThumbnailPhoto } from '../../lib/photos/types'

interface ThumbnailProps {
  photo: ThumbnailPhoto
  isSelected: boolean
  isSelectable: boolean
  onMouseDown: (e: React.MouseEvent) => void
  onClick: () => void
}

export const Thumbnail = memo(function Thumbnail({
  photo,
  isSelected,
  isSelectable,
  onMouseDown,
  onClick,
}: ThumbnailProps) {
  const [localRating, setLocalRating] = useState(photo.starRating)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const containerRef = useRef<HTMLLIElement>(null)

  const [updateRating] = useMutation(UPDATE_PHOTO_RATING)

  useEffect(() => {
    setLocalRating(photo.starRating)
  }, [photo.starRating])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: '200px', threshold: 0 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const handleRatingChange = (newRating: number) => {
    setLocalRating(newRating)
    updateRating({
      variables: { photoId: photo.id, starRating: newRating },
    }).catch(() => setLocalRating(photo.starRating))
  }

  const canHover =
    typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches

  return (
    <li
      ref={containerRef}
      data-id={photo.id}
      data-testid={`thumbnail-${photo.id}`}
      className={`relative w-full pb-[100%] rounded-[10px] cursor-pointer list-none bg-[#292929] ${
        isSelected ? 'bg-transparent' : ''
      }`}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      <div
        className={`absolute inset-0 transition-transform duration-100 ease-in-out ${
          isSelected ? 'scale-90' : 'scale-100'
        }`}
      >
        {isVisible && (
          <img
            src={photo.thumbnailUrl}
            alt=""
            className={`w-full h-full rounded-[10px] object-cover transition-opacity duration-300 ease-in ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ transform: `rotate(${photo.rotation}deg)` }}
            onLoad={() => setIsLoaded(true)}
          />
        )}

        {isLoaded && (
          <div className="absolute inset-0 rounded-[10px] shadow-[0_4px_8px_1px_rgba(0,0,0,0.3)] pointer-events-none" />
        )}

        <div className="absolute bottom-1.5 left-1.5">
          <StarRating
            rating={localRating}
            onRatingChange={
              !isSelectable && canHover ? handleRatingChange : undefined
            }
          />
        </div>
      </div>

      <div
        className={`absolute flex items-center justify-center rounded-full transition-opacity duration-150 ${
          isSelected
            ? 'w-[22px] h-[22px] bottom-[5px] right-[5px] bg-teal-500 opacity-100'
            : isSelectable
              ? 'w-[15px] h-[15px] bottom-[5px] right-[5px] border-[2px] border-white/80 opacity-100'
              : 'opacity-0'
        }`}
        data-testid={isSelected ? `thumbnail-selected-${photo.id}` : undefined}
      >
        {isSelected && <Check className="w-[14px] h-[14px] text-white stroke-[4] relative top-px" />}
      </div>
    </li>
  )
})
