import { useEffect, useRef, useCallback } from 'react'

/**
 * Custom hook for infinite scroll using IntersectionObserver.
 * Uses a sentinel element at the bottom of the list to trigger loading
 * when the user scrolls near the bottom.
 *
 * @param {Function} refetchPhotos - Callback to fetch more items
 * @param {boolean} hasMore - Whether more items are available (optional, defaults to true)
 * @returns {Array} [containerRef, sentinelRef] - Refs to attach to scroll container and sentinel element
 */
function useInfiniteScroll(refetchPhotos, hasMore = true) {
  const containerRef = useRef(null)
  const sentinelRef = useRef(null)
  const isFetchingRef = useRef(false)

  const handleIntersect = useCallback(
    async (entries) => {
      const [entry] = entries

      // Only trigger if:
      // 1. Sentinel is intersecting (visible)
      // 2. Not already fetching
      // 3. More items available
      if (entry.isIntersecting && !isFetchingRef.current && hasMore) {
        isFetchingRef.current = true
        try {
          await refetchPhotos()
        } finally {
          isFetchingRef.current = false
        }
      }
    },
    [refetchPhotos, hasMore]
  )

  useEffect(() => {
    const sentinel = sentinelRef.current
    const container = containerRef.current

    if (!sentinel || !container) return

    const observer = new IntersectionObserver(handleIntersect, {
      root: container,
      rootMargin: '1000px', // Preload when within 1000px of bottom
      threshold: 0,
    })

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [handleIntersect])

  return [containerRef, sentinelRef]
}

export default useInfiniteScroll
