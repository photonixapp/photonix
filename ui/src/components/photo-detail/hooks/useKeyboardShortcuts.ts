import { useEffect, useCallback } from 'react'

interface KeyboardShortcutsOptions {
  onEscape?: () => void
  onPrev?: () => void
  onNext?: () => void
  onToggleBoundingBox?: () => void
  onToggleInfo?: () => void
  enabled?: boolean
}

export function useKeyboardShortcuts({
  onEscape,
  onPrev,
  onNext,
  onToggleBoundingBox,
  onToggleInfo,
  enabled = true,
}: KeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      switch (event.key) {
        case 'Escape':
          onEscape?.()
          break
        case 'ArrowLeft':
          onPrev?.()
          break
        case 'ArrowRight':
          onNext?.()
          break
        case 'b':
        case 'B':
          onToggleBoundingBox?.()
          break
        case 'i':
        case 'I':
          onToggleInfo?.()
          break
      }
    },
    [onEscape, onPrev, onNext, onToggleBoundingBox, onToggleInfo]
  )

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, handleKeyDown])
}
