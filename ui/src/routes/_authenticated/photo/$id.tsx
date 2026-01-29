import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@apollo/client/react'
import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { GET_PHOTO, GET_PHOTOS_AROUND } from '../../../lib/photos/detail-graphql'
import { usePhotoListStore } from '../../../lib/photos/photo-list-store'
import { PhotoDetailView } from '../../../components/photo-detail'
import type { PhotoDetail } from '../../../lib/photos/detail-types'

export const Route = createFileRoute('/_authenticated/photo/$id')({
  component: PhotoDetailPage,
})

function PhotoDetailPage() {
  const { id } = Route.useParams()
  const { photoIds, setCurrentPhotoId, setPhotoList, setCurrentIndex } = usePhotoListStore()

  // Keep track of the currently displayed photo to avoid re-rendering during carousel navigation
  // Once we have a photo loaded, we keep showing it even if the URL changes
  // (the carousel handles displaying the correct photo internally)
  const displayedPhotoRef = useRef<PhotoDetail | null>(null)


  // Check if we have a photo list (came from thumbnails) or need to fetch surrounding photos
  const needsPhotoList = photoIds.length === 0

  // Check if the requested photo is in our photo list (carousel navigation)
  const isInPhotoList = photoIds.includes(id)

  // Fetch surrounding photos when landing directly on this page
  const { data: photosAroundData } = useQuery(GET_PHOTOS_AROUND, {
    variables: { photoId: id, count: 100 },
    skip: !needsPhotoList,
  })

  // Populate the store with surrounding photos when we get them
  useEffect(() => {
    if (photosAroundData?.photosAround) {
      const { photoIds: ids, rotations, currentIndex } = photosAroundData.photosAround
      setPhotoList(ids, rotations)
      setCurrentIndex(currentIndex)
    }
  }, [photosAroundData, setPhotoList, setCurrentIndex])

  // Set current photo in store when navigating (when list already exists)
  useEffect(() => {
    if (!needsPhotoList) {
      setCurrentPhotoId(id)
    }
  }, [id, needsPhotoList, setCurrentPhotoId])

  // Fetch photo details - skip if we already have a photo loaded and this is a carousel navigation
  // (the carousel handles showing the correct photo, we just need the initial photo data)
  const shouldSkipFetch = displayedPhotoRef.current !== null && isInPhotoList
  const { data, loading, error } = useQuery(GET_PHOTO, {
    variables: { id },
    skip: shouldSkipFetch,
  })

  // Update the displayed photo when we get new data
  if (data?.photo && data.photo.id !== displayedPhotoRef.current?.id) {
    displayedPhotoRef.current = data.photo
  }

  // Use the cached photo if available, otherwise use the fetched data
  const photoToDisplay = displayedPhotoRef.current || data?.photo

  // Only show loading for initial load, not for carousel navigation
  if (loading && !photoToDisplay) {
    return (
      <div className="fixed inset-0 bg-[#1d1d1d] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-white/60 animate-spin" />
      </div>
    )
  }

  if (error && !photoToDisplay) {
    return (
      <div className="fixed inset-0 bg-[#1d1d1d] flex items-center justify-center">
        <div className="text-white/60">
          {error ? `Error: ${error.message}` : 'Photo not found'}
        </div>
      </div>
    )
  }

  if (!photoToDisplay) {
    return (
      <div className="fixed inset-0 bg-[#1d1d1d] flex items-center justify-center">
        <div className="text-white/60">Photo not found</div>
      </div>
    )
  }

  return <PhotoDetailView photo={photoToDisplay} />
}
