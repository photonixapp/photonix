export type FilterType =
  | 'Locations'
  | 'Objects'
  | 'People'
  | 'Colors'
  | 'Styles'
  | 'Events'
  | 'Cameras'
  | 'Lenses'
  | 'Generic Tags'

export interface SelectedFilter {
  id: string // e.g., "tag:abc-123" or "camera:xyz-456"
  name: string // Display name
  group: FilterType
}

export interface AutocompleteOption {
  id: string
  name: string
  type: FilterType
}

export interface SearchState {
  // Search text (what user is typing)
  searchText: string
  // Selected filters (pills)
  selectedFilters: SelectedFilter[]
  // Actions
  setSearchText: (text: string) => void
  addFilter: (filter: SelectedFilter) => void
  removeFilter: (filterId: string) => void
  clearAll: () => void
}
