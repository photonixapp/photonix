import { create } from 'zustand'
import type { SearchState, SelectedFilter } from './types'

export const useSearchStore = create<SearchState>()((set) => ({
  searchText: '',
  selectedFilters: [],
  mode: 'filters',
  semanticQuery: '',

  setSearchText: (text) => set({ searchText: text }),

  setMode: (mode) =>
    // Leaving semantic mode drops any active semantic query so the grid falls
    // back to filter results.
    set(mode === 'semantic' ? { mode } : { mode, semanticQuery: '' }),

  setSemanticQuery: (query) => set({ semanticQuery: query }),

  addFilter: (filter: SelectedFilter) =>
    set((state) => {
      // Prevent duplicates
      if (state.selectedFilters.some((f) => f.id === filter.id)) {
        return state
      }
      return { selectedFilters: [...state.selectedFilters, filter] }
    }),

  removeFilter: (filterId: string) =>
    set((state) => ({
      selectedFilters: state.selectedFilters.filter((f) => f.id !== filterId),
    })),

  setPrefixFilter: (prefix: string, filter: SelectedFilter | null) =>
    set((state) => {
      const withoutPrefix = state.selectedFilters.filter(
        (f) => !f.id.startsWith(`${prefix}:`)
      )
      return {
        selectedFilters: filter
          ? [...withoutPrefix, filter]
          : withoutPrefix,
      }
    }),

  clearAll: () => set({ searchText: '', selectedFilters: [], semanticQuery: '' }),
}))
