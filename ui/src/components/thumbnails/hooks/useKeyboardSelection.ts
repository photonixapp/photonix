import { useEffect, useState, useCallback } from 'react'

interface UseKeyboardSelectionOptions {
  onSelectAll: () => void
  onClearSelection: () => void
}

export function useKeyboardSelection({
  onSelectAll,
  onClearSelection,
}: UseKeyboardSelectionOptions) {
  const [ctrlKeyPressed, setCtrlKeyPressed] = useState(false)
  const [shiftKeyPressed, setShiftKeyPressed] = useState(false)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        setCtrlKeyPressed(true)
      }
      if (e.key === 'Shift') {
        setShiftKeyPressed(true)
      }
      if (e.key === 'Escape') {
        onClearSelection()
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        if (e.shiftKey) {
          onClearSelection()
        } else {
          onSelectAll()
        }
      }
    },
    [onSelectAll, onClearSelection]
  )

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Control' || e.key === 'Meta') {
      setCtrlKeyPressed(false)
    }
    if (e.key === 'Shift') {
      setShiftKeyPressed(false)
    }
  }, [])

  const handleWindowFocus = useCallback(() => {
    setCtrlKeyPressed(false)
    setShiftKeyPressed(false)
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    window.addEventListener('focus', handleWindowFocus)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('focus', handleWindowFocus)
    }
  }, [handleKeyDown, handleKeyUp, handleWindowFocus])

  return { ctrlKeyPressed, shiftKeyPressed }
}
