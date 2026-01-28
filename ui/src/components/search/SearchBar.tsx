import { useState, useRef, useCallback, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { FilterPill } from './FilterPill'
import { AutocompleteDropdown } from './AutocompleteDropdown'
import { useSearchStore } from '../../lib/search/store'
import { useAutocomplete } from '../../lib/search/hooks'
import { KEYS } from '../../lib/search/constants'
import type { AutocompleteOption, SelectedFilter } from '../../lib/search/types'

export function SearchBar() {
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const {
    searchText,
    selectedFilters,
    setSearchText,
    addFilter,
    removeFilter,
    clearAll,
  } = useSearchStore()

  const { options } = useAutocomplete()
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  // Reset active index when options change
  useEffect(() => {
    setActiveIndex(0)
  }, [options])

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
    setShowDropdown(true)
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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

  const hasContent = searchText || selectedFilters.length > 0

  return (
    <div
      ref={containerRef}
      className="relative bg-neutral-800 rounded-b-lg px-2 py-1"
      data-testid="search-bar"
    >
      <div className="flex items-center gap-2 flex-wrap">
        <Search className="w-5 h-5 text-neutral-400 shrink-0" />

        {/* Filter pills */}
        {selectedFilters.map((filter) => (
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
          onFocus={() => setShowDropdown(true)}
          placeholder={selectedFilters.length === 0 ? 'Search photos...' : ''}
          className="flex-1 min-w-[100px] bg-transparent border-none outline-none text-white placeholder-neutral-500 py-1"
          data-testid="search-input"
        />

        {/* Clear all button */}
        {hasContent && (
          <button
            type="button"
            onClick={clearAll}
            className="p-1 rounded hover:bg-neutral-700 transition-colors"
            aria-label="Clear all filters"
            data-testid="search-clear-all"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        )}
      </div>

      {/* Autocomplete dropdown */}
      <AutocompleteDropdown
        options={options}
        activeIndex={activeIndex}
        onSelect={handleSelectOption}
        visible={showDropdown && searchText.length > 0}
      />
    </div>
  )
}
