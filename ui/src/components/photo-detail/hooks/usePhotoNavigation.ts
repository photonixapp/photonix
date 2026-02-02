import { useCallback, useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { usePhotoListStore } from '../../../lib/photos/photo-list-store'

interface UsePhotoNavigationOptions {
  currentPhotoId: string
}

export function usePhotoNavigation({ currentPhotoId }: UsePhotoNavigationOptions) {
  const navigate = useNavigate()
  const {
    getPrevPhotoId,
    getNextPhotoId,
    getPrevPhotoIds,
    getNextPhotoIds,
    hasPrev,
    hasNext,
  } = usePhotoListStore()

  const preloadedIds = useRef<Set<string>>(new Set())

  // Preload adjacent images (2 on each side)
  useEffect(() => {
    const idsToPreload = [
      ...getPrevPhotoIds(2),
      ...getNextPhotoIds(2),
    ]

    idsToPreload.forEach((id) => {
      if (!preloadedIds.current.has(id)) {
        const img = new Image()
        img.src = `/thumbnailer/photo/1920x1920_contain_q75/${id}/`
        preloadedIds.current.add(id)
      }
    })
  }, [currentPhotoId, getPrevPhotoIds, getNextPhotoIds])

  const goToPrev = useCallback(() => {
    const prevId = getPrevPhotoId()
    if (prevId) {
      navigate({ to: '/photo/$id', params: { id: prevId } })
    }
  }, [getPrevPhotoId, navigate])

  const goToNext = useCallback(() => {
    const nextId = getNextPhotoId()
    if (nextId) {
      navigate({ to: '/photo/$id', params: { id: nextId } })
    }
  }, [getNextPhotoId, navigate])

  const goToHome = useCallback(() => {
    navigate({ to: '/' })
  }, [navigate])

  return {
    goToPrev,
    goToNext,
    goToHome,
    hasPrev: hasPrev(),
    hasNext: hasNext(),
  }
}
