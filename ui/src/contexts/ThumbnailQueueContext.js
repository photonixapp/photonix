import React, { createContext, useContext, useRef, useCallback } from 'react'

const ThumbnailQueueContext = createContext(null)

const MAX_CONCURRENT_LOADS = 8

export const ThumbnailQueueProvider = ({ children }) => {
  const queueRef = useRef([]) // Items waiting to load: { id, url, resolve }
  const activeRef = useRef(new Set()) // Currently loading URLs
  const loadedRef = useRef(new Set()) // Already loaded URLs

  const processQueue = useCallback(() => {
    // Sort queue by vertical position (top items first)
    queueRef.current.sort((a, b) => (a.top || 0) - (b.top || 0))

    while (
      queueRef.current.length > 0 &&
      activeRef.current.size < MAX_CONCURRENT_LOADS
    ) {
      const item = queueRef.current.shift()
      if (!item || loadedRef.current.has(item.url) || activeRef.current.has(item.url)) {
        continue
      }

      activeRef.current.add(item.url)

      const img = new Image()
      img.onload = () => {
        activeRef.current.delete(item.url)
        loadedRef.current.add(item.url)
        item.resolve(item.url)
        processQueue()
      }
      img.onerror = () => {
        activeRef.current.delete(item.url)
        item.resolve(null) // Resolve with null on error
        processQueue()
      }
      img.src = item.url
    }
  }, [])

  const requestThumbnail = useCallback((id, url, top) => {
    // Already loaded
    if (loadedRef.current.has(url)) {
      return Promise.resolve(url)
    }

    // Already in queue or loading
    const existingInQueue = queueRef.current.find(item => item.url === url)
    if (existingInQueue) {
      // Update position if it moved
      existingInQueue.top = Math.min(existingInQueue.top || Infinity, top)
      return existingInQueue.promise
    }

    if (activeRef.current.has(url)) {
      return new Promise(resolve => {
        // Wait for the active load to complete
        const checkLoaded = setInterval(() => {
          if (loadedRef.current.has(url)) {
            clearInterval(checkLoaded)
            resolve(url)
          }
        }, 50)
      })
    }

    // Add to queue
    let resolve
    const promise = new Promise(r => { resolve = r })
    queueRef.current.push({ id, url, top, resolve, promise })

    // Process queue on next tick to batch requests
    setTimeout(processQueue, 0)

    return promise
  }, [processQueue])

  const cancelRequest = useCallback((url) => {
    queueRef.current = queueRef.current.filter(item => item.url !== url)
  }, [])

  const isLoaded = useCallback((url) => {
    return loadedRef.current.has(url)
  }, [])

  return (
    <ThumbnailQueueContext.Provider value={{ requestThumbnail, cancelRequest, isLoaded }}>
      {children}
    </ThumbnailQueueContext.Provider>
  )
}

export const useThumbnailQueue = () => {
  const context = useContext(ThumbnailQueueContext)
  if (!context) {
    throw new Error('useThumbnailQueue must be used within ThumbnailQueueProvider')
  }
  return context
}

export default ThumbnailQueueContext
