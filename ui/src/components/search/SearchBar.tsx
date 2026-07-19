import { useState, useRef, useCallback, useEffect } from 'react'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import { FilterPill } from './FilterPill'
import { FilterPanel } from './FilterPanel'
import { AutocompleteDropdown } from './AutocompleteDropdown'
import { useSearchStore } from '../../lib/search/store'
import { useAutocomplete } from '../../lib/search/hooks'
import { KEYS } from '../../lib/search/constants'
import { useLibrariesStore } from '../../lib/libraries'
import type { AutocompleteOption, SelectedFilter } from '../../lib/search/types'

export function SearchBar() {
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const {
    searchText,
    selectedFilters,
    mode,
    semanticQuery,
    setSearchText,
    addFilter,
    removeFilter,
    clearAll,
    setMode,
    setSemanticQuery,
  } = useSearchStore()

  const { getActiveLibrary } = useLibrariesStore()
  // The natural-language mode is only offered when the active library has the
  // CLIP semantic-search analyzer enabled.
  const semanticAvailable = !!getActiveLibrary()?.classificationClipEnabled
  const isSemantic = mode === 'semantic'

  const { options } = useAutocomplete()
  const [showDropdown, setShowDropdown] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  // If semantic search stops being available (e.g. library switch), fall back
  // to filter mode so the bar never gets stuck in an unusable state.
  useEffect(() => {
    if (isSemantic && !semanticAvailable) {
      setMode('filters')
    }
  }, [isSemantic, semanticAvailable, setMode])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value)
    // Autocomplete only applies to structured filter search.
    if (!isSemantic) {
      setShowDropdown(true)
      // Reset the highlighted option as the query (and thus the list) changes.
      setActiveIndex(0)
    }
  }

  const handleSelectOption = useCallback(
    (option: AutocompleteOption) => {
      const filter: SelectedFilter = {
        id: option.id,
        name: option.name,
        group: option.type,
      }
      addFilter(filter)
      setSearchText('')
      setShowDropdown(false)
      inputRef.current?.focus()
    },
    [addFilter, setSearchText]
  )

  const submitSemantic = useCallback(() => {
    const trimmed = searchText.trim()
    if (trimmed) {
      setSemanticQuery(trimmed)
      setShowDropdown(false)
    }
  }, [searchText, setSemanticQuery])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // In natural-language mode Enter submits the query to the semantic search;
    // the autocomplete keyboard handling below is filter-mode only.
    if (isSemantic) {
      if (e.key === KEYS.ENTER) {
        e.preventDefault()
        submitSemantic()
      }
      return
    }

    switch (e.key) {
      case KEYS.ARROW_DOWN:
        e.preventDefault()
        if (showDropdown && options.length > 0) {
          setActiveIndex((prev) => Math.min(prev + 1, options.length - 1))
        }
        break

      case KEYS.ARROW_UP:
        e.preventDefault()
        if (showDropdown) {
          setActiveIndex((prev) => Math.max(prev - 1, 0))
        }
        break

      case KEYS.ENTER:
      case KEYS.TAB:
        if (showDropdown && options[activeIndex]) {
          e.preventDefault()
          handleSelectOption(options[activeIndex])
        }
        break

      case KEYS.ESCAPE:
        setShowDropdown(false)
        break

      case KEYS.BACKSPACE:
        if (searchText === '' && selectedFilters.length > 0) {
          // Remove the last filter
          removeFilter(selectedFilters[selectedFilters.length - 1].id)
        }
        break
    }
  }

  // In semantic mode an active (submitted) query counts as content even after
  // the input is emptied, so the clear button stays reachable while results
  // are showing. Clearing in semantic mode leaves the filter pills alone -
  // they belong to the other mode and the user will expect them back.
  const hasContent = isSemantic
    ? searchText || semanticQuery
    : searchText || selectedFilters.length > 0

  const handleClear = useCallback(() => {
    if (isSemantic) {
      setSearchText('')
      setSemanticQuery('')
    } else {
      clearAll()
    }
  }, [isSemantic, setSearchText, setSemanticQuery, clearAll])

  // Touch swipe on the search bar expands (down) / collapses (up) the filters
  // panel, mirroring master's swipeable search area.
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchStart.current.x
    const dy = t.clientY - touchStart.current.y
    touchStart.current = null
    if (Math.abs(dy) > 50 && Math.abs(dy) > Math.abs(dx)) {
      setShowFilters(dy > 0)
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative bg-neutral-800 rounded-b-lg px-2 py-1"
      data-testid="search-bar"
    >
      {/* Filters vs. natural-language mode toggle (only when CLIP is enabled) */}
      {semanticAvailable && (
        <div className="flex justify-end pb-1" data-testid="search-mode-toggle">
          <div className="flex rounded-md bg-neutral-900 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setMode('filters')}
              className={`px-2 py-0.5 rounded transition-colors ${
                isSemantic
                  ? 'text-neutral-400 hover:text-neutral-200'
                  : 'bg-teal-600 text-white'
              }`}
              aria-pressed={!isSemantic}
              data-testid="search-mode-filters"
            >
              Filters
            </button>
            <button
              type="button"
              onClick={() => setMode('semantic')}
              className={`px-2 py-0.5 rounded transition-colors ${
                isSemantic
                  ? 'bg-teal-600 text-white'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              aria-pressed={isSemantic}
              data-testid="search-mode-semantic"
            >
              Natural language
            </button>
          </div>
        </div>
      )}

      <div
        className="flex items-center gap-2 flex-wrap"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Search className="w-5 h-5 text-neutral-400 shrink-0" />

        {/* Filter pills (filter mode only) */}
        {!isSemantic &&
          selectedFilters.map((filter) => (
            <FilterPill
              key={filter.id}
              id={filter.id}
              name={filter.name}
              group={filter.group}
              onRemove={removeFilter}
            />
          ))}

        {/* Search input */}
        <input
          ref={inputRef}
          type="text"
          value={searchText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (!isSemantic) setShowDropdown(true)
          }}
          placeholder={
            isSemantic
              ? 'Describe the photos you are looking for...'
              : selectedFilters.length === 0
                ? 'Search photos...'
                : ''
          }
          className="flex-1 min-w-[100px] bg-transparent border-none outline-none text-white placeholder-neutral-500 py-1"
          data-testid="search-input"
        />

        {/* Clear all button */}
        {hasContent && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded hover:bg-neutral-700 transition-colors"
            aria-label={isSemantic ? 'Clear search' : 'Clear all filters'}
            data-testid="search-clear-all"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        )}

        {/* Filters panel toggle (filter mode only) */}
        {!isSemantic && (
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`p-1 rounded transition-colors ${
              showFilters ? 'text-teal-400' : 'text-neutral-400 hover:bg-neutral-700'
            }`}
            aria-label="Toggle filters panel"
            aria-expanded={showFilters}
            data-testid="filters-toggle"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Autocomplete dropdown (filter mode only) */}
      {!isSemantic && (
        <AutocompleteDropdown
          options={options}
          activeIndex={activeIndex}
          onSelect={handleSelectOption}
          visible={showDropdown && searchText.length > 0}
        />
      )}

      {/* Collapsible filters panel */}
      {!isSemantic && showFilters && <FilterPanel />}
    </div>
  )
}
