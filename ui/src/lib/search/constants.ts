import {
  MapPin,
  Tag,
  User,
  Palette,
  Sparkles,
  Calendar,
  Camera,
  type LucideIcon,
} from 'lucide-react'
import type { FilterType } from './types'

export const FILTER_TYPE_ICONS: Record<FilterType, LucideIcon> = {
  Locations: MapPin,
  Objects: Tag,
  People: User,
  Colors: Palette,
  Styles: Sparkles,
  Events: Calendar,
  Cameras: Camera,
  Lenses: Camera,
  'Generic Tags': Tag,
}

// Keyboard key names (using modern key values)
export const KEYS = {
  BACKSPACE: 'Backspace',
  TAB: 'Tab',
  ENTER: 'Enter',
  ESCAPE: 'Escape',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
} as const
