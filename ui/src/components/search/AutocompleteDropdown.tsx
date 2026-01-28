import { forwardRef } from 'react'
import { FILTER_TYPE_ICONS } from '../../lib/search/constants'
import type { AutocompleteOption } from '../../lib/search/types'

interface AutocompleteDropdownProps {
  options: AutocompleteOption[]
  activeIndex: number
  onSelect: (option: AutocompleteOption) => void
  visible: boolean
}

export const AutocompleteDropdown = forwardRef<
  HTMLUListElement,
  AutocompleteDropdownProps
>(({ options, activeIndex, onSelect, visible }, ref) => {
  if (!visible || options.length === 0) return null

  return (
    <ul
      ref={ref}
      className="absolute top-full left-0 right-0 mt-1 bg-neutral-700 rounded-md shadow-lg max-h-72 overflow-y-auto z-50"
      role="listbox"
      data-testid="autocomplete-dropdown"
    >
      {options.map((option, index) => {
        const Icon = FILTER_TYPE_ICONS[option.type]
        const isActive = index === activeIndex

        return (
          <li
            key={option.id}
            role="option"
            aria-selected={isActive}
            className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors ${
              isActive ? 'bg-neutral-600' : 'hover:bg-neutral-600'
            }`}
            onClick={() => onSelect(option)}
            data-testid={`autocomplete-option-${option.id}`}
          >
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-neutral-400" />
              <span className="text-white">{option.name}</span>
            </div>
            <span className="text-xs text-neutral-400">{option.type}</span>
          </li>
        )
      })}
    </ul>
  )
})

AutocompleteDropdown.displayName = 'AutocompleteDropdown'
