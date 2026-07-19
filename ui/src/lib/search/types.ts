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
  | 'Aperture'
  | 'Exposure'
  | 'ISO Speed'
  | 'Focal Length'
  | 'Rating'
  | 'Flash'
  | 'Metering Mode'
  | 'Drive Mode'
  | 'Shooting Mode'

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

// Which search mode the bar is in: structured tag/metadata filters, or
// free-text CLIP semantic search.
export type SearchMode = 'filters' | 'semantic'

export interface SearchState {
  // Search text (what user is typing)
  searchText: string
  // Selected filters (pills)
  selectedFilters: SelectedFilter[]
  // Filters vs. natural-language (semantic) search
  mode: SearchMode
  // The submitted semantic query (empty string when none is active). Kept
  // separate from `searchText` so the grid only re-queries on submit, not on
  // every keystroke.
  semanticQuery: string
  // Actions
  setSearchText: (text: string) => void
  addFilter: (filter: SelectedFilter) => void
  removeFilter: (filterId: string) => void
  // Set (or clear, with null) the single active filter for a `prefix:` facet
  // such as aperture/flash/meteringMode. Replaces any existing filter with the
  // same prefix.
  setPrefixFilter: (prefix: string, filter: SelectedFilter | null) => void
  setMode: (mode: SearchMode) => void
  setSemanticQuery: (query: string) => void
  clearAll: () => void
}
