import { useRef, useEffect, useCallback, forwardRef, useState } from 'react'
import { PhotoViewer } from './PhotoViewer'
import { usePhotoListStore } from '../../lib/photos/photo-list-store'
import type { PersonTag, ObjectTag } from '../../lib/photos/detail-types'

interface PhotoCarouselProps {
  currentPhotoId: string
  rotation: number
  rotationsByPhotoId?: Record<string, number>
  onPhotoChange: (photoId: string) => void
  onClick?: () => void
  // Bounding box props (only shown on current photo when tags match)
  personTags?: PersonTag[]
  objectTags?: ObjectTag[]
  showPeopleBoxes?: boolean
  showObjectBoxes?: boolean
  onRefetch?: () => void
  tagsPhotoId?: string // ID of the photo whose tags we're displaying
}

// Slot assignment: maps photoId to a stable slot number
// When a photo is first seen, it gets assigned to a slot
// When scrolling, we recycle the slot that's going off-screen
interface SlotAssignment {
  photoId: string
  slotIndex: number
  visualPosition: number // 0-4 position in the carousel (left to right)
}

export const PhotoCarousel = forwardRef<HTMLDivElement, PhotoCarouselProps>(
  function PhotoCarousel({ currentPhotoId, rotation, rotationsByPhotoId, onPhotoChange, onClick, personTags, objectTags, showPeopleBoxes, showObjectBoxes, onRefetch, tagsPhotoId }, forwardedRef) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isZoomed, setIsZoomed] = useState(false)

  // Track which slot each photo is assigned to
  // Key: photoId, Value: slot index (0-4)
  const slotMapRef = useRef<Map<string, number>>(new Map())
  // Track which slots are currently in use
  const usedSlotsRef = useRef<Set<number>>(new Set())

  // Merge refs - expose the container to both internal use and parent
  const setRefs = useCallback((element: HTMLDivElement | null) => {
    // Update internal ref
    (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = element

    // Update forwarded ref
    if (forwardedRef) {
      if (typeof forwardedRef === 'function') {
        forwardedRef(element)
      } else {
        forwardedRef.current = element
      }
    }
  }, [forwardedRef])

  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Only subscribe to photoIds - NOT currentIndex
  // This prevents re-renders when currentIndex changes in the store
  const photoIds = usePhotoListStore((state) => state.photoIds)
  const setCurrentIndex = usePhotoListStore((state) => state.setCurrentIndex)

  // Calculate visible photos based on currentPhotoId prop (not store's currentIndex)
  // This way, the carousel controls what's visible, not the store
  const currentIndexInList = photoIds.indexOf(currentPhotoId)

  // Get 2 photos on each side + current (5 total, or less at edges)
  const prevIds: string[] = []
  const nextIds: string[] = []
  if (currentIndexInList >= 0) {
    for (let i = 1; i <= 2 && currentIndexInList - i >= 0; i++) {
      prevIds.push(photoIds[currentIndexInList - i])
    }
    for (let i = 1; i <= 2 && currentIndexInList + i < photoIds.length; i++) {
      nextIds.push(photoIds[currentIndexInList + i])
    }
  }
  const visibleIds = [...prevIds.reverse(), currentPhotoId, ...nextIds]

  // The index within visibleIds where current photo is
  const currentVisibleIndex = prevIds.length

  // Assign slots to photos - keep existing assignments, only recycle slots for new photos
  const slotAssignments: SlotAssignment[] = []
  const currentlyVisiblePhotoIds = new Set(visibleIds)

  // First, remove photos that are no longer visible from the slot map
  for (const [photoId, slotIndex] of slotMapRef.current.entries()) {
    if (!currentlyVisiblePhotoIds.has(photoId)) {
      slotMapRef.current.delete(photoId)
      usedSlotsRef.current.delete(slotIndex)
    }
  }

  // Now assign slots to visible photos
  for (let visualPosition = 0; visualPosition < visibleIds.length; visualPosition++) {
    const photoId = visibleIds[visualPosition]

    // Check if this photo already has a slot
    let slotIndex = slotMapRef.current.get(photoId)

    if (slotIndex === undefined) {
      // Find an unused slot
      for (let i = 0; i < 5; i++) {
        if (!usedSlotsRef.current.has(i)) {
          slotIndex = i
          break
        }
      }

      if (slotIndex === undefined) {
        // This shouldn't happen if we have 5 slots for 5 photos
        console.error('No available slot found!')
        slotIndex = 0
      }

      slotMapRef.current.set(photoId, slotIndex)
      usedSlotsRef.current.add(slotIndex)
    }

    slotAssignments.push({
      photoId,
      slotIndex,
      visualPosition,
    })
  }

  // Sort by slot index for consistent React rendering order
  // (the visual order is controlled by CSS flexbox order property)
  slotAssignments.sort((a, b) => a.slotIndex - b.slotIndex)


  // Scroll to center on mount and when currentPhotoId changes
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scrollToPhoto = () => {
      const slideWidth = container.clientWidth
      const targetScroll = currentVisibleIndex * slideWidth
      container.scrollTo({ left: targetScroll, behavior: 'instant' })
    }

    // Delay slightly to ensure layout is computed
    requestAnimationFrame(scrollToPhoto)
  }, [currentPhotoId, currentVisibleIndex])

  // Handle scroll end to detect which photo we landed on
  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    scrollTimeoutRef.current = setTimeout(() => {
      const container = containerRef.current
      if (!container) return

      const slideWidth = container.clientWidth
      const scrollLeft = container.scrollLeft
      const newVisibleIndex = Math.round(scrollLeft / slideWidth)

      // Only update if we scrolled to a different photo
      if (newVisibleIndex !== currentVisibleIndex && newVisibleIndex >= 0 && newVisibleIndex < visibleIds.length) {
        const newPhotoId = visibleIds[newVisibleIndex]
        if (newPhotoId && newPhotoId !== currentPhotoId) {
          // Calculate new global index from the photo's position in the list
          const newGlobalIndex = photoIds.indexOf(newPhotoId)
          if (newGlobalIndex >= 0) {
            setCurrentIndex(newGlobalIndex)
            onPhotoChange(newPhotoId)
          }
        }
      }
    }, 100)
  }, [currentVisibleIndex, visibleIds, currentPhotoId, photoIds, setCurrentIndex, onPhotoChange])

  // Get rotation for a photo - use provided map or fall back to current rotation for current photo
  const getRotationForPhoto = useCallback((photoId: string, visualIndex: number) => {
    if (rotationsByPhotoId && photoId in rotationsByPhotoId) {
      return rotationsByPhotoId[photoId]
    }
    // Fallback: only apply rotation to current photo
    return visualIndex === currentVisibleIndex ? rotation : 0
  }, [rotationsByPhotoId, rotation, currentVisibleIndex])

  // Handle zoom change from the current photo viewer
  const handleZoomChange = useCallback((zoomed: boolean) => {
    setIsZoomed(zoomed)
  }, [])

  return (
    <div
      ref={setRefs}
      className={`w-full h-full flex overflow-x-auto scroll-smooth ${
        isZoomed ? '' : 'snap-x snap-mandatory'
      }`}
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch',
        // Disable touch scrolling when zoomed
        touchAction: isZoomed ? 'none' : 'pan-x',
        // Disable scroll when zoomed
        overflowX: isZoomed ? 'hidden' : 'auto',
      }}
      onScroll={handleScroll}
      data-testid="photo-carousel"
    >
      <style>{`
        [data-testid="photo-carousel"]::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Use stable slot index as key - photos keep their slots until they leave the viewport */}
      {slotAssignments.map(({ slotIndex, photoId, visualPosition }) => {
        const isCurrent = visualPosition === currentVisibleIndex
        return (
          <div
            key={`slot-${slotIndex}`}
            className={`w-full h-full flex-shrink-0 ${isZoomed ? '' : 'snap-start'}`}
            style={{
              scrollSnapAlign: isZoomed ? 'none' : 'start',
              order: visualPosition, // CSS order controls visual position
            }}
          >
            <PhotoViewer
              photoId={photoId}
              rotation={getRotationForPhoto(photoId, visualPosition)}
              isCurrent={isCurrent}
              onClick={onClick}
              onZoomChange={isCurrent ? handleZoomChange : undefined}
              // Only show bounding boxes when tags match the visible photo
              personTags={isCurrent && tagsPhotoId === photoId ? personTags : undefined}
              objectTags={isCurrent && tagsPhotoId === photoId ? objectTags : undefined}
              showPeopleBoxes={isCurrent && tagsPhotoId === photoId ? showPeopleBoxes : false}
              showObjectBoxes={isCurrent && tagsPhotoId === photoId ? showObjectBoxes : false}
              onRefetch={isCurrent ? onRefetch : undefined}
            />
          </div>
        )
      })}
    </div>
  )
})

// Export scroll functions as standalone hook for external navigation
export function useCarouselNavigation(carouselRef: React.RefObject<HTMLDivElement | null>) {
  const scrollToPrev = useCallback(() => {
    const container = carouselRef.current
    if (!container) return
    const slideWidth = container.clientWidth
    container.scrollTo({
      left: container.scrollLeft - slideWidth,
      behavior: 'smooth',
    })
  }, [carouselRef])

  const scrollToNext = useCallback(() => {
    const container = carouselRef.current
    if (!container) return
    const slideWidth = container.clientWidth
    container.scrollTo({
      left: container.scrollLeft + slideWidth,
      behavior: 'smooth',
    })
  }, [carouselRef])

  return { scrollToPrev, scrollToNext }
}
