import { create } from 'zustand'

interface ImageCacheEntry {
  width: number
  height: number
}

// Simple module-level cache - no React state, just a Map
// This avoids all the Zustand/React re-render complexity
const imageCache = new Map<string, ImageCacheEntry>()
const MAX_CACHE_SIZE = 20

export function isImageCached(url: string): boolean {
  return imageCache.has(url)
}

export function getCachedDimensions(url: string): ImageCacheEntry | undefined {
  return imageCache.get(url)
}

export function markImageLoaded(url: string, dimensions: ImageCacheEntry): void {
  // If at max size, remove oldest entry (first in map)
  if (imageCache.size >= MAX_CACHE_SIZE && !imageCache.has(url)) {
    const firstKey = imageCache.keys().next().value
    if (firstKey) {
      imageCache.delete(firstKey)
    }
  }
  imageCache.set(url, dimensions)
}

export function clearImageCache(): void {
  imageCache.clear()
}

export function getImageCacheSize(): number {
  return imageCache.size
}

// Zustand store just for triggering re-renders when cache changes
// Components subscribe to this to know when to re-check the cache
interface ImageCacheStore {
  // Increment this to trigger re-renders in subscribed components
  version: number
  // Notify that cache changed
  notifyCacheChanged: () => void
}

export const useImageCacheStore = create<ImageCacheStore>((set) => ({
  version: 0,
  notifyCacheChanged: () => set((state) => ({ version: state.version + 1 })),
}))

// Helper to generate thumbnail URL for a photo
export function getPhotoThumbnailUrl(photoId: string): string {
  return `/thumbnailer/photo/3840x3840_contain_q75/${photoId}/`
}
