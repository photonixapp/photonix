import { useCallback, useMemo, useState, useEffect } from 'react'
import { useQuery } from '@apollo/client/react'
import { useNavigate } from '@tanstack/react-router'
import { Thumbnail } from './Thumbnail'
import { useKeyboardSelection } from './hooks/useKeyboardSelection'
import { useInfiniteScroll } from './hooks/useInfiniteScroll'
import { useLibrariesStore } from '../../lib/libraries'
import { usePhotoFilters } from '../../lib/search'
import { usePhotoListStore } from '../../lib/photos/photo-list-store'
import { GET_PHOTOS, PHOTOS_PER_PAGE } from '../../lib/photos/graphql'
import type { ThumbnailPhoto, PhotoEdge, AllPhotosResponse } from '../../lib/photos/types'

export function Thumbnails() {
  const { activeLibraryId } = useLibrariesStore()
  const filters = usePhotoFilters()
  const navigate = useNavigate()
  const { setPhotoList, saveScrollPosition, scrollPosition } = usePhotoListStore()

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)

  const { data, loading, fetchMore } = useQuery(GET_PHOTOS, {
    variables: { filters, first: PHOTOS_PER_PAGE },
    skip: !filters.includes('library_id:'),
  })

  const photos: ThumbnailPhoto[] = useMemo(() => {
    return (data?.allPhotos.edges ?? []).map((edge: PhotoEdge) => ({
      id: edge.node.id,
      thumbnailUrl: `/thumbnailer/photo/256x256_cover_q50/${edge.node.id}/`,
      starRating: edge.node.starRating,
      rotation: edge.node.rotation,
    }))
  }, [data])

  const allPhotoIds = useMemo(() => photos.map((p) => p.id), [photos])

  // Build rotation map from photos
  const rotationsByPhotoId = useMemo(() => {
    const map: Record<string, number> = {}
    for (const photo of photos) {
      map[photo.id] = photo.rotation
    }
    return map
  }, [photos])

  // Populate photo list store when photos change
  useEffect(() => {
    if (allPhotoIds.length > 0) {
      setPhotoList(allPhotoIds, rotationsByPhotoId)
    }
  }, [allPhotoIds, rotationsByPhotoId, setPhotoList])

  // Restore scroll position when returning from photo detail
  useEffect(() => {
    if (scrollPosition > 0) {
      window.scrollTo(0, scrollPosition)
    }
  }, [scrollPosition])

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const index = prev.indexOf(id)
      if (index > -1) {
        return prev.filter((sid) => sid !== id)
      }
      return [...prev, id]
    })
    setLastSelectedId(id)
  }, [])

  const selectRange = useCallback(
    (fromId: string, toId: string) => {
      const fromIndex = allPhotoIds.indexOf(fromId)
      const toIndex = allPhotoIds.indexOf(toId)
      if (fromIndex === -1 || toIndex === -1) return

      const start = Math.min(fromIndex, toIndex)
      const end = Math.max(fromIndex, toIndex)
      const rangeIds = allPhotoIds.slice(start, end + 1)

      setSelectedIds((prev) => [...new Set([...prev, ...rangeIds])])
    },
    [allPhotoIds]
  )

  const selectAll = useCallback(() => {
    setSelectedIds(allPhotoIds)
    if (allPhotoIds.length > 0) {
      setLastSelectedId(allPhotoIds[allPhotoIds.length - 1])
    }
  }, [allPhotoIds])

  const clearSelection = useCallback(() => {
    setSelectedIds([])
    setLastSelectedId(null)
  }, [])

  const { ctrlKeyPressed, shiftKeyPressed } = useKeyboardSelection({
    onSelectAll: selectAll,
    onClearSelection: clearSelection,
  })

  const hasNextPage = data?.allPhotos.pageInfo.hasNextPage ?? false
  const endCursor = data?.allPhotos.pageInfo.endCursor

  const loadMore = useCallback(async () => {
    if (!endCursor) return
    await fetchMore({
      variables: { after: endCursor },
      updateQuery: (
        prev: AllPhotosResponse,
        { fetchMoreResult }: { fetchMoreResult?: AllPhotosResponse }
      ) => {
        if (!fetchMoreResult) return prev
        return {
          allPhotos: {
            ...fetchMoreResult.allPhotos,
            edges: [
              ...prev.allPhotos.edges,
              ...fetchMoreResult.allPhotos.edges,
            ],
          },
        }
      },
    })
  }, [fetchMore, endCursor])

  const sentinelRef = useInfiniteScroll({
    hasNextPage,
    isFetching: loading,
    onLoadMore: loadMore,
  })

  const isSelecting = selectedIds.length > 0

  const handleMouseDown = useCallback(
    (photoId: string) => (e: React.MouseEvent) => {
      // Check modifiers from both keyboard state and the event itself
      const isShiftClick = shiftKeyPressed || e.shiftKey
      const isCtrlClick = ctrlKeyPressed || e.ctrlKey || e.metaKey

      if (isShiftClick && lastSelectedId) {
        // Shift+click with existing selection: select range
        selectRange(lastSelectedId, photoId)
        setLastSelectedId(photoId)
      } else if (isCtrlClick || isShiftClick || isSelecting) {
        // Ctrl+click, Shift+click (first selection), or click while selecting: toggle
        toggleSelection(photoId)
      }
    },
    [
      shiftKeyPressed,
      ctrlKeyPressed,
      lastSelectedId,
      isSelecting,
      selectRange,
      toggleSelection,
    ]
  )

  // Navigate to photo detail on click (when not in selection mode)
  const handleClick = useCallback(
    (photoId: string) => () => {
      if (!isSelecting && !ctrlKeyPressed && !shiftKeyPressed) {
        // Save scroll position before navigating
        saveScrollPosition(window.scrollY)
        navigate({ to: '/photo/$id', params: { id: photoId } })
      }
    },
    [isSelecting, ctrlKeyPressed, shiftKeyPressed, saveScrollPosition, navigate]
  )

  const showSelectable = isSelecting || ctrlKeyPressed || shiftKeyPressed

  if (!activeLibraryId) {
    return (
      <div className="p-10 text-neutral-400">
        Select a library to view photos.
      </div>
    )
  }

  return (
    <ul
      className="m-0 p-10 grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-5 max-md:p-5 max-md:grid-cols-[repeat(auto-fill,minmax(100px,1fr))] max-sm:p-2.5 max-sm:grid-cols-[repeat(auto-fill,minmax(90px,1fr))] max-sm:gap-2.5"
      data-testid="thumbnails-grid"
    >
      {photos.map((photo) => (
        <Thumbnail
          key={photo.id}
          photo={photo}
          isSelected={selectedIds.includes(photo.id)}
          isSelectable={showSelectable}
          onMouseDown={handleMouseDown(photo.id)}
          onClick={handleClick(photo.id)}
        />
      ))}

      <div ref={sentinelRef} className="h-px" aria-hidden="true" />
    </ul>
  )
}
