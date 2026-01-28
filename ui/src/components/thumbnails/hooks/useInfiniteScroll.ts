import { useEffect, useRef, useCallback } from 'react'

interface UseInfiniteScrollOptions {
  hasNextPage: boolean
  isFetching: boolean
  onLoadMore: () => Promise<void>
  rootMargin?: string
}

export function useInfiniteScroll({
  hasNextPage,
  isFetching,
  onLoadMore,
  rootMargin = '1000px',
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const isFetchingRef = useRef(false)

  const handleIntersect = useCallback(
    async (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries
      if (
        entry.isIntersecting &&
        !isFetchingRef.current &&
        hasNextPage &&
        !isFetching
      ) {
        isFetchingRef.current = true
        try {
          await onLoadMore()
        } finally {
          isFetchingRef.current = false
        }
      }
    },
    [hasNextPage, isFetching, onLoadMore]
  )

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin,
      threshold: 0,
    })

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [handleIntersect, rootMargin])

  return sentinelRef
}
