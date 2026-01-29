import { useState, useCallback, useRef } from 'react'
import { useMutation } from '@apollo/client/react'
import { useNavigate } from '@tanstack/react-router'
import { PhotoToolbar } from './PhotoToolbar'
import { PhotoCarousel, useCarouselNavigation } from './PhotoCarousel'
import { NavigationArrows } from './NavigationArrows'
import { PhotoInfoSidebar } from './PhotoInfoSidebar'
import { FullscreenButton } from './FullscreenButton'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useImageRotation } from './hooks/useImageRotation'
import { usePhotoListStore } from '../../lib/photos/photo-list-store'
import { UPDATE_PHOTO_RATING } from '../../lib/photos/graphql'
import type { PhotoDetail } from '../../lib/photos/detail-types'

interface PhotoDetailViewProps {
  photo: PhotoDetail
}

export function PhotoDetailView({ photo }: PhotoDetailViewProps) {
  const navigate = useNavigate()
  const carouselRef = useRef<HTMLDivElement>(null)


  const [showInfo, setShowInfo] = useState(false)
  const [showToolbar, setShowToolbar] = useState(true)
  const [showNavArrows, setShowNavArrows] = useState(false)
  const [showBoundingBox, setShowBoundingBox] = useState(() => {
    const stored = localStorage.getItem('showBoundingBox')
    return stored !== null ? stored === 'true' : true
  })
  const [localRating, setLocalRating] = useState(photo.starRating)

  // Track current photo for carousel (may differ from URL during swipe)
  const [currentPhotoId, setCurrentPhotoId] = useState(photo.id)

  const [updateRating] = useMutation(UPDATE_PHOTO_RATING)

  const { hasPrev, hasNext, rotationsByPhotoId, updateRotation } = usePhotoListStore()

  // Carousel navigation (smooth scrolling)
  const { scrollToPrev, scrollToNext } = useCarouselNavigation(carouselRef)

  // Callback to update rotation in the store when user rotates
  const handleRotationChange = useCallback((newRotation: number) => {
    updateRotation(photo.id, newRotation)
  }, [photo.id, updateRotation])

  const {
    totalRotation,
    rotateClockwise,
    rotateCounterClockwise,
  } = useImageRotation({
    photoFileId: photo.baseFileId,
    initialRotation: photo.rotation,
    initialUserRotation: photo.userRotation,
    onRotationChange: handleRotationChange,
  })

  const goToHome = useCallback(() => {
    navigate({ to: '/' })
  }, [navigate])

  const toggleInfo = useCallback(() => {
    setShowInfo((prev) => !prev)
  }, [])

  const toggleBoundingBox = useCallback(() => {
    setShowBoundingBox((prev) => {
      const newValue = !prev
      localStorage.setItem('showBoundingBox', String(newValue))
      return newValue
    })
  }, [])

  const handleViewerClick = useCallback(() => {
    if (showInfo) {
      setShowInfo(false)
    } else {
      setShowToolbar((prev) => !prev)
    }
  }, [showInfo])

  const handleRatingChange = useCallback(
    (newRating: number) => {
      setLocalRating(newRating)
      updateRating({
        variables: { photoId: photo.id, starRating: newRating },
      }).catch(() => setLocalRating(photo.starRating))
    },
    [photo.id, photo.starRating, updateRating]
  )

  // Handle photo change from carousel (swipe or scroll)
  // Update URL so refreshing shows the correct photo, but the route component
  // is smart enough to not refetch when the photo is in the carousel
  const handlePhotoChange = useCallback((newPhotoId: string) => {
    setCurrentPhotoId(newPhotoId)
    // Update URL in browser history - the route component will detect this is a
    // carousel navigation and skip refetching
    window.history.replaceState(null, '', `/photo/${newPhotoId}`)
  }, [])

  // Keyboard shortcuts - use carousel scroll for prev/next
  useKeyboardShortcuts({
    onEscape: goToHome,
    onPrev: scrollToPrev,
    onNext: scrollToNext,
    onToggleBoundingBox: toggleBoundingBox,
    onToggleInfo: toggleInfo,
  })

  return (
    <div
      className="fixed inset-0 bg-[#1d1d1d] flex"
      onMouseMove={() => setShowNavArrows(true)}
      onMouseLeave={() => setShowNavArrows(false)}
    >
      {/* Main photo area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Toolbar */}
        {showToolbar && (
          <PhotoToolbar
            onBack={goToHome}
            onRotateCW={rotateClockwise}
            onRotateCCW={rotateCounterClockwise}
            downloadUrl={photo.downloadUrl}
            showInfo={showInfo}
            onToggleInfo={toggleInfo}
          />
        )}

        {/* Photo carousel with swipe support */}
        <PhotoCarousel
          ref={carouselRef}
          currentPhotoId={currentPhotoId}
          rotation={totalRotation}
          rotationsByPhotoId={rotationsByPhotoId}
          onPhotoChange={handlePhotoChange}
          onClick={handleViewerClick}
        />

        {/* Navigation arrows */}
        <NavigationArrows
          onPrev={scrollToPrev}
          onNext={scrollToNext}
          hasPrev={hasPrev()}
          hasNext={hasNext()}
          visible={showNavArrows || showToolbar}
        />

        {/* Fullscreen button */}
        <FullscreenButton />
      </div>

      {/* Info sidebar */}
      <PhotoInfoSidebar
        photo={{ ...photo, starRating: localRating }}
        show={showInfo}
        showBoundingBox={showBoundingBox}
        onToggleBoundingBox={toggleBoundingBox}
        onRatingChange={handleRatingChange}
      />
    </div>
  )
}
