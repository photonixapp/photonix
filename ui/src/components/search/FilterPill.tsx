import { X } from 'lucide-react'
import { FILTER_TYPE_ICONS } from '../../lib/search/constants'
import type { FilterType } from '../../lib/search/types'

interface FilterPillProps {
  id: string
  name: string
  group: FilterType
  onRemove: (id: string) => void
}

export function FilterPill({ id, name, group, onRemove }: FilterPillProps) {
  const Icon = FILTER_TYPE_ICONS[group]

  return (
    <span
      className="inline-flex items-center gap-1.5 bg-neutral-600 rounded-full px-3 py-1 text-sm text-white"
      data-testid={`filter-pill-${id}`}
    >
      <Icon className="w-3.5 h-3.5 text-neutral-300" />
      <span>{name}</span>
      <button
        type="button"
        onClick={() => onRemove(id)}
        className="ml-0.5 p-0.5 rounded-full hover:bg-neutral-500 transition-colors"
        aria-label={`Remove ${name} filter`}
        data-testid={`filter-pill-remove-${id}`}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </span>
  )
}
