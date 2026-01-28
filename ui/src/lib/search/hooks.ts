import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@apollo/client/react'
import { GET_ALL_FILTERS, type AllFiltersResponse } from './graphql'
import type { AutocompleteOption, FilterType } from './types'
import { useLibrariesStore } from '../libraries'
import { useSearchStore } from './store'

/**
 * Debounce hook - better than setTimeout approach
 * Uses 300ms default (faster than old 400ms)
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

/**
 * Transform API response to flat autocomplete options
 */
function transformToOptions(data: AllFiltersResponse): AutocompleteOption[] {
  const options: AutocompleteOption[] = []

  const addTagOptions = (
    tags: { id: string; name: string }[],
    type: FilterType
  ) => {
    tags.forEach((tag) => {
      options.push({ id: `tag:${tag.id}`, name: tag.name, type })
    })
  }

  addTagOptions(data.allLocationTags, 'Locations')
  addTagOptions(data.allObjectTags, 'Objects')
  addTagOptions(data.allPersonTags, 'People')
  addTagOptions(data.allColorTags, 'Colors')
  addTagOptions(data.allStyleTags, 'Styles')
  addTagOptions(data.allEventTags, 'Events')
  addTagOptions(data.allGenericTags, 'Generic Tags')

  data.allCameras.forEach((cam) => {
    options.push({
      id: `camera:${cam.id}`,
      name: `${cam.make} ${cam.model}`.trim(),
      type: 'Cameras',
    })
  })

  data.allLenses.forEach((lens) => {
    options.push({
      id: `lens:${lens.id}`,
      name: lens.name,
      type: 'Lenses',
    })
  })

  return options
}

/**
 * Autocomplete hook - fetches and filters suggestions
 */
export function useAutocomplete() {
  const { activeLibraryId } = useLibrariesStore()
  const { searchText, selectedFilters } = useSearchStore()
  const debouncedSearch = useDebounce(searchText, 300)

  // Build multiFilter string from selected filters
  const multiFilter = useMemo(() => {
    const parts = selectedFilters.map((f) => f.id)
    if (activeLibraryId) {
      parts.unshift(`library_id:${activeLibraryId}`)
    }
    return parts.join(' ') || undefined
  }, [selectedFilters, activeLibraryId])

  const { data, loading } = useQuery(GET_ALL_FILTERS, {
    variables: {
      libraryId: activeLibraryId!,
      multiFilter,
    },
    skip: !activeLibraryId,
  })

  // Transform and filter options
  const filteredOptions = useMemo(() => {
    if (!data || !debouncedSearch.trim()) return []

    const allOptions = transformToOptions(data)
    const searchLower = debouncedSearch.toLowerCase()

    // Filter by search text and exclude already selected
    const selectedIds = new Set(selectedFilters.map((f) => f.id))

    return allOptions
      .filter(
        (opt) =>
          opt.name.toLowerCase().includes(searchLower) &&
          !selectedIds.has(opt.id)
      )
      .slice(0, 20) // Limit results for performance
  }, [data, debouncedSearch, selectedFilters])

  return { options: filteredOptions, loading }
}

/**
 * Build the complete filter string for photos query
 */
export function usePhotoFilters(): string {
  const { activeLibraryId } = useLibrariesStore()
  const { selectedFilters, searchText } = useSearchStore()
  const debouncedSearch = useDebounce(searchText, 300)

  return useMemo(() => {
    const parts: string[] = []

    if (activeLibraryId) {
      parts.push(`library_id:${activeLibraryId}`)
    }

    // Add selected filter IDs
    selectedFilters.forEach((f) => {
      parts.push(f.id)
    })

    // Add free text search (for date matching, etc.)
    if (debouncedSearch.trim()) {
      parts.push(debouncedSearch.trim())
    }

    return parts.join(' ')
  }, [activeLibraryId, selectedFilters, debouncedSearch])
}
