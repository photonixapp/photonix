import { useEffect, useState, useCallback } from 'react'
import { useApolloClient } from '@apollo/client/react'
import { GET_PHOTO } from '../../../lib/photos/detail-graphql'
import type { PhotoDetail } from '../../../lib/photos/detail-types'

interface UseCurrentPhotoDataResult {
  photo: PhotoDetail
  refetch: () => void
}

/**
 * Fetches photo data for the current carousel photo.
 * Uses Apollo cache first, then fetches if needed.
 * Does NOT cause re-renders of PhotoViewer components.
 */
export function useCurrentPhotoData(
  currentPhotoId: string,
  initialPhoto: PhotoDetail
): UseCurrentPhotoDataResult {
  const client = useApolloClient()
  const [currentPhoto, setCurrentPhoto] = useState<PhotoDetail>(initialPhoto)

  const fetchPhoto = useCallback((photoId: string) => {
    client.query<{ photo: PhotoDetail }>({
      query: GET_PHOTO,
      variables: { id: photoId },
      fetchPolicy: 'network-only',
    }).then((result) => {
      if (result.data?.photo) {
        setCurrentPhoto(result.data.photo)
      }
    }).catch((error) => {
      console.error('Failed to fetch photo data:', error)
    })
  }, [client])

  useEffect(() => {
    // If it's the initial photo, use it directly
    if (currentPhotoId === initialPhoto.id) {
      setCurrentPhoto(initialPhoto)
      return
    }

    // Try to read from Apollo cache first
    try {
      const cached = client.cache.readQuery<{ photo: PhotoDetail }>({
        query: GET_PHOTO,
        variables: { id: currentPhotoId },
      })
      if (cached?.photo) {
        setCurrentPhoto(cached.photo)
        return
      }
    } catch {
      // Not in cache, need to fetch
    }

    // Fetch from network
    fetchPhoto(currentPhotoId)
  }, [currentPhotoId, initialPhoto, client, fetchPhoto])

  const refetch = useCallback(() => {
    fetchPhoto(currentPhotoId)
  }, [currentPhotoId, fetchPhoto])

  return { photo: currentPhoto, refetch }
}
