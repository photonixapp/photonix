import { useCallback, useMemo, useState, useEffect } from 'react'
import { useQuery, useApolloClient } from '@apollo/client/react'
import { useNavigate } from '@tanstack/react-router'
import { Thumbnail } from './Thumbnail'
import { FabMenu } from './FabMenu'
import { AddTagModal } from './AddTagModal'
import { useKeyboardSelection } from './hooks/useKeyboardSelection'
import { useInfiniteScroll } from './hooks/useInfiniteScroll'
import { useLibrariesStore } from '../../lib/libraries'
import { usePhotoFilters, useSearchStore } from '../../lib/search'
import { usePhotoListStore } from '../../lib/photos/photo-list-store'
import {
  GET_PHOTOS,
  PHOTOS_PER_PAGE,
  SEMANTIC_SEARCH_PHOTOS,
} from '../../lib/photos/graphql'
import { SET_PHOTOS_DELETED } from '../../lib/photos/batch-graphql'
import {
  ASSIGN_TAG_TO_PHOTOS,
  REMOVE_PHOTOS_FROM_ALBUM,
} from '../../lib/albums/graphql'
import type { ThumbnailPhoto, PhotoEdge, AllPhotosResponse } from '../../lib/photos/types'

// Cap on how many semantic-search results to fetch and render at once. The
// query is un-paginated, so this bounds the single request.
const SEMANTIC_SEARCH_LIMIT = 100

interface ThumbnailsProps {
  // When set, restrict the grid to photos tagged with this album (a Tag id).
  albumId?: string
}

export function Thumbnails({ albumId }: ThumbnailsProps = {}) {
  const { activeLibraryId } = useLibrariesStore()
  const baseFilters = usePhotoFilters()
  const filters = albumId ? `${baseFilters} tag:${albumId}` : baseFilters
  const { mode, semanticQuery } = useSearchStore()
  // Natural-language search replaces the filter grid on the main timeline only
  // (albums keep their tag-scoped filter view).
  const isSemantic = mode === 'semantic' && !!semanticQuery && !albumId
  const navigate = useNavigate()
  const client = useApolloClient()
  const { setPhotoList, saveScrollPosition, scrollPosition } = usePhotoListStore()

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)
  const [batchModal, setBatchModal] = useState<'tag' | 'album' | null>(null)

  const { data, loading, fetchMore, refetch } = useQuery(GET_PHOTOS, {
    variables: { filters, first: PHOTOS_PER_PAGE },
    skip: !filters.includes('library_id:') || isSemantic,
  })

  const { data: semanticData, loading: semanticLoading } = useQuery(
    SEMANTIC_SEARCH_PHOTOS,
    {
      variables: {
        libraryId: activeLibraryId!,
        query: semanticQuery,
        first: SEMANTIC_SEARCH_LIMIT,
      },
      skip: !isSemantic || !activeLibraryId,
      fetchPolicy: 'cache-and-network',
    }
  )

  const photos: ThumbnailPhoto[] = useMemo(() => {
    if (isSemantic) {
      // Results already arrive ordered by descending similarity score.
      return (semanticData?.semanticSearchPhotos ?? []).map((result) => ({
        id: result.photo.id,
        thumbnailUrl: `/thumbnailer/photo/256x256_cover_q50/${result.photo.id}/`,
        starRating: result.photo.starRating,
        rotation: result.photo.rotation,
      }))
    }
    return (data?.allPhotos.edges ?? []).map((edge: PhotoEdge) => ({
      id: edge.node.id,
      thumbnailUrl: `/thumbnailer/photo/256x256_cover_q50/${edge.node.id}/`,
      starRating: edge.node.starRating,
      rotation: edge.node.rotation,
    }))
  }, [isSemantic, semanticData, data])

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

  // Long-press on touch enters/toggles selection.
  const handleLongPress = useCallback(
    (photoId: string) => {
      toggleSelection(photoId)
    },
    [toggleSelection]
  )

  // --- Batch actions -------------------------------------------------------

  const assignTag = useCallback(
    async (name: string, tagType: string) => {
      if (selectedIds.length === 0) return
      await client.mutate({
        mutation: ASSIGN_TAG_TO_PHOTOS,
        variables: { name, photoIds: selectedIds.join(','), tagType },
      })
      clearSelection()
    },
    [client, selectedIds, clearSelection]
  )

  const handleDelete = useCallback(async () => {
    if (selectedIds.length === 0) return
    await client.mutate({
      mutation: SET_PHOTOS_DELETED,
      variables: { photoIds: selectedIds.join(',') },
    })
    clearSelection()
    refetch()
  }, [client, selectedIds, clearSelection, refetch])

  const handleRemoveFromAlbum = useCallback(async () => {
    if (selectedIds.length === 0 || !albumId) return
    await client.mutate({
      mutation: REMOVE_PHOTOS_FROM_ALBUM,
      variables: { photoIds: selectedIds.join(','), albumId },
    })
    clearSelection()
    refetch()
  }, [client, selectedIds, albumId, clearSelection, refetch])

  const { ctrlKeyPressed, shiftKeyPressed } = useKeyboardSelection({
    onSelectAll: selectAll,
    onClearSelection: clearSelection,
  })

  // Semantic search returns a single, un-paginated ranked page.
  const hasNextPage = isSemantic
    ? false
    : (data?.allPhotos.pageInfo.hasNextPage ?? false)
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

  // Natural-language search that returned nothing (and isn't still loading):
  // show a hint rather than an empty grid.
  if (isSemantic && !semanticLoading && photos.length === 0) {
    return (
      <div className="p-10 text-neutral-400" data-testid="semantic-no-results">
        No photos match “{semanticQuery}”.
      </div>
    )
  }

  return (
    <>
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
            onLongPress={() => handleLongPress(photo.id)}
          />
        ))}

        <div ref={sentinelRef} className="h-px" aria-hidden="true" />
      </ul>

      {selectedIds.length > 0 && (
        <FabMenu
          selectedCount={selectedIds.length}
          isAlbumView={!!albumId}
          onAddTag={() => setBatchModal('tag')}
          onAddAlbum={() => setBatchModal('album')}
          onRemoveFromAlbum={handleRemoveFromAlbum}
          onDelete={handleDelete}
          onClear={clearSelection}
        />
      )}

      {batchModal === 'tag' && (
        <AddTagModal
          title={`Tag ${selectedIds.length} photo${selectedIds.length === 1 ? '' : 's'}`}
          label="Tag name"
          onSubmit={(name) => assignTag(name, 'G')}
          onClose={() => setBatchModal(null)}
        />
      )}

      {batchModal === 'album' && (
        <AddTagModal
          title={`Add ${selectedIds.length} photo${selectedIds.length === 1 ? '' : 's'} to album`}
          label="Album name"
          onSubmit={(name) => assignTag(name, 'A')}
          onClose={() => setBatchModal(null)}
        />
      )}
    </>
  )
}
