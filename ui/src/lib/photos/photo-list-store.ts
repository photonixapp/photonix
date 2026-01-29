import { create } from 'zustand'

interface PhotoListState {
  // Photo IDs in order (for navigation)
  photoIds: string[]

  // Rotation by photo ID (total rotation = exif + user)
  rotationsByPhotoId: Record<string, number>

  // Current photo index
  currentIndex: number

  // Scroll position to restore when returning to grid
  scrollPosition: number

  // Actions
  setPhotoList: (ids: string[], rotations?: Record<string, number>) => void
  updateRotation: (photoId: string, rotation: number) => void
  setCurrentPhotoId: (id: string) => void
  setCurrentIndex: (index: number) => void
  saveScrollPosition: (position: number) => void

  // Navigation helpers
  getCurrentPhotoId: () => string | null
  getPrevPhotoId: () => string | null
  getNextPhotoId: () => string | null
  getPrevPhotoIds: (count: number) => string[]
  getNextPhotoIds: (count: number) => string[]
  getRotation: (photoId: string) => number
  hasPrev: () => boolean
  hasNext: () => boolean
}

export const usePhotoListStore = create<PhotoListState>()((set, get) => ({
  photoIds: [],
  rotationsByPhotoId: {},
  currentIndex: -1,
  scrollPosition: 0,

  setPhotoList: (ids, rotations) => set({
    photoIds: ids,
    rotationsByPhotoId: rotations ?? {}
  }),

  updateRotation: (photoId, rotation) => set((state) => ({
    rotationsByPhotoId: { ...state.rotationsByPhotoId, [photoId]: rotation }
  })),

  setCurrentPhotoId: (id) => {
    const { photoIds } = get()
    const index = photoIds.indexOf(id)
    if (index !== -1) {
      set({ currentIndex: index })
    }
  },

  setCurrentIndex: (index) => set({ currentIndex: index }),

  saveScrollPosition: (position) => set({ scrollPosition: position }),

  getCurrentPhotoId: () => {
    const { photoIds, currentIndex } = get()
    if (currentIndex >= 0 && currentIndex < photoIds.length) {
      return photoIds[currentIndex]
    }
    return null
  },

  getPrevPhotoId: () => {
    const { photoIds, currentIndex } = get()
    if (currentIndex > 0) {
      return photoIds[currentIndex - 1]
    }
    return null
  },

  getNextPhotoId: () => {
    const { photoIds, currentIndex } = get()
    if (currentIndex >= 0 && currentIndex < photoIds.length - 1) {
      return photoIds[currentIndex + 1]
    }
    return null
  },

  // Get up to `count` previous photo IDs (for preloading)
  getPrevPhotoIds: (count) => {
    const { photoIds, currentIndex } = get()
    const result: string[] = []
    for (let i = 1; i <= count && currentIndex - i >= 0; i++) {
      result.push(photoIds[currentIndex - i])
    }
    return result
  },

  // Get up to `count` next photo IDs (for preloading)
  getNextPhotoIds: (count) => {
    const { photoIds, currentIndex } = get()
    const result: string[] = []
    for (let i = 1; i <= count && currentIndex + i < photoIds.length; i++) {
      result.push(photoIds[currentIndex + i])
    }
    return result
  },

  hasPrev: () => {
    const { currentIndex } = get()
    return currentIndex > 0
  },

  hasNext: () => {
    const { photoIds, currentIndex } = get()
    return currentIndex >= 0 && currentIndex < photoIds.length - 1
  },

  getRotation: (photoId) => {
    const { rotationsByPhotoId } = get()
    return rotationsByPhotoId[photoId] ?? 0
  },
}))
