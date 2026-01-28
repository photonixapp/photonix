import { create } from 'zustand'
import type { SearchState, SelectedFilter } from './types'

export const useSearchStore = create<SearchState>()((set) => ({
  searchText: '',
  selectedFilters: [],

  setSearchText: (text) => set({ searchText: text }),

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

  clearAll: () => set({ searchText: '', selectedFilters: [] }),
}))
