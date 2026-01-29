import { useState, useCallback } from 'react'
import { useMutation } from '@apollo/client/react'
import { SAVE_ROTATION } from '../../../lib/photos/detail-graphql'

interface UseImageRotationOptions {
  photoFileId: string | null
  initialRotation: number
  initialUserRotation: number
  onRotationChange?: (totalRotation: number) => void
}

export function useImageRotation({
  photoFileId,
  initialRotation,
  initialUserRotation,
  onRotationChange,
}: UseImageRotationOptions) {
  // User rotation is the adjustable part; rotation = exifRotation + userRotation
  const [userRotation, setUserRotation] = useState(initialUserRotation)
  const exifRotation = initialRotation - initialUserRotation

  const [saveRotationMutation] = useMutation(SAVE_ROTATION)

  const rotateClockwise = useCallback(() => {
    const newUserRotation = (userRotation + 90) % 360
    setUserRotation(newUserRotation)
    const newTotalRotation = ((exifRotation + newUserRotation) % 360 + 360) % 360
    onRotationChange?.(newTotalRotation)
    if (photoFileId) {
      saveRotationMutation({
        variables: { photoFileId, rotation: newUserRotation },
      })
    }
  }, [userRotation, exifRotation, photoFileId, saveRotationMutation, onRotationChange])

  const rotateCounterClockwise = useCallback(() => {
    const newUserRotation = (userRotation - 90 + 360) % 360
    setUserRotation(newUserRotation)
    const newTotalRotation = ((exifRotation + newUserRotation) % 360 + 360) % 360
    onRotationChange?.(newTotalRotation)
    if (photoFileId) {
      saveRotationMutation({
        variables: { photoFileId, rotation: newUserRotation },
      })
    }
  }, [userRotation, exifRotation, photoFileId, saveRotationMutation, onRotationChange])

  // Total rotation for display (exif + user)
  const totalRotation = ((exifRotation + userRotation) % 360 + 360) % 360

  return {
    totalRotation,
    userRotation,
    exifRotation,
    rotateClockwise,
    rotateCounterClockwise,
  }
}
