import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Library } from './types'

interface LibrariesState {
  libraries: Library[]
  activeLibraryId: string | null
  setLibraries: (libraries: Library[]) => void
  setActiveLibrary: (id: string) => void
  getActiveLibrary: () => Library | undefined
}

export const useLibrariesStore = create<LibrariesState>()(
  persist(
    (set, get) => ({
      libraries: [],
      activeLibraryId: null,

      setLibraries: (libraries) => {
        const state = get()
        // If no active library is set, default to the first one
        const activeId =
          state.activeLibraryId &&
          libraries.some((lib) => lib.id === state.activeLibraryId)
            ? state.activeLibraryId
            : libraries[0]?.id ?? null

        set({ libraries, activeLibraryId: activeId })
      },

      setActiveLibrary: (id) => set({ activeLibraryId: id }),

      getActiveLibrary: () => {
        const state = get()
        return state.libraries.find((lib) => lib.id === state.activeLibraryId)
      },
    }),
    {
      name: 'photonix-libraries',
      partialize: (state) => ({ activeLibraryId: state.activeLibraryId }),
    }
  )
)
