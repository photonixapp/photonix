import { useState, useRef, useEffect, useCallback } from 'react'
import { useMutation } from '@apollo/client/react'
import { Edit2, X, Check } from 'lucide-react'
import {
  EDIT_FACE_TAG,
  BLOCK_FACE_TAG,
  VERIFY_FACE_TAG,
} from '../../lib/photos/detail-graphql'
import type { PersonTag, ObjectTag } from '../../lib/photos/detail-types'

interface BoundingBoxesProps {
  personTags: PersonTag[]
  objectTags: ObjectTag[]
  rotation: number
  visible: boolean
  onRefetch?: () => void
}

// Transform bounding box coordinates from rotated image space to un-rotated thumbnail space.
// The classifier processes EXIF-corrected (rotated) images, so box coordinates are in
// post-rotation space. But thumbnails are stored without rotation, so we need to
// transform the coordinates to match the un-rotated image before CSS rotation is applied.
function transformBoxCoords(
  posX: number,
  posY: number,
  sizeX: number,
  sizeY: number,
  rotation: number
) {
  // Normalize rotation to 0, 90, 180, 270
  const rot = ((rotation % 360) + 360) % 360

  if (rot === 0) {
    return { posX, posY, sizeX, sizeY }
  } else if (rot === 90) {
    // 90° CW: (x, y) on rotated → (y, 1-x) on original, swap width/height
    return {
      posX: posY,
      posY: 1 - posX,
      sizeX: sizeY,
      sizeY: sizeX,
    }
  } else if (rot === 180) {
    // 180°: (x, y) → (1-x, 1-y)
    return {
      posX: 1 - posX,
      posY: 1 - posY,
      sizeX,
      sizeY,
    }
  } else if (rot === 270) {
    // 270° CW: (x, y) on rotated → (1-y, x) on original, swap width/height
    return {
      posX: 1 - posY,
      posY: posX,
      sizeX: sizeY,
      sizeY: sizeX,
    }
  }
  return { posX, posY, sizeX, sizeY }
}

interface FaceBoxProps {
  tag: PersonTag
  rotation: number
  onEdit: (tagId: string, newName: string) => void
  onBlock: (tagId: string) => void
  onVerify: (tagId: string) => void
}

function FaceBox({ tag, rotation, onEdit, onBlock, onVerify }: FaceBoxProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

  const transformed = transformBoxCoords(
    tag.positionX,
    tag.positionY,
    tag.sizeX,
    tag.sizeY,
    rotation
  )

  const left = `${(transformed.posX - transformed.sizeX / 2) * 100}%`
  const top = `${(transformed.posY - transformed.sizeY / 2) * 100}%`
  const width = `${transformed.sizeX * 100}%`
  const height = `${transformed.sizeY * 100}%`

  // Box color based on state
  const borderColor = tag.deleted
    ? 'border-gray-400/50'
    : tag.verified
      ? 'border-green-400/75'
      : 'border-yellow-400/75'

  const labelBg = tag.deleted
    ? 'bg-gray-400/50 text-gray-800'
    : tag.verified
      ? 'bg-green-400/50 text-gray-900'
      : 'bg-yellow-400/50 text-gray-900'

  const handleSave = useCallback(() => {
    if (editValue.trim()) {
      onEdit(tag.id, editValue.trim())
    }
    setIsEditing(false)
    setEditValue('')
  }, [tag.id, editValue, onEdit])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation()
      if (e.key === 'Enter') {
        handleSave()
      } else if (e.key === 'Escape') {
        setIsEditing(false)
        setEditValue('')
      }
    },
    [handleSave]
  )

  return (
    <div
      className={`absolute border-2 rounded ${borderColor}`}
      style={{ left, top, width, height }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Label container - counter-rotated */}
      <div
        className="absolute top-0 left-0 flex flex-col items-start"
        style={{ transform: `rotate(${360 - rotation}deg)`, transformOrigin: 'top left' }}
      >
        {isEditing ? (
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="text-sm px-1 py-0.5 bg-white text-black rounded border-0 w-32"
              placeholder={tag.tag.name}
            />
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleSave()
              }}
              className="p-1 bg-green-500 rounded-full"
            >
              <Check className="w-3 h-3 text-white" />
            </button>
          </div>
        ) : (
          <>
            {!tag.deleted && (
              <span className={`text-xs px-1 py-0.5 rounded-sm whitespace-nowrap ${labelBg}`}>
                {tag.tag.name}
              </span>
            )}

            {/* Action icons */}
            <div className="flex gap-1 mt-1">
              {!tag.verified && !tag.deleted && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onBlock(tag.id)
                  }}
                  className="p-1 bg-red-500 rounded-full"
                  title="Reject face tag"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              )}
              {tag.showVerifyIcon && !tag.deleted && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onVerify(tag.id)
                  }}
                  className="p-1 bg-green-500 rounded-full"
                  title="Verify face tag"
                >
                  <Check className="w-3 h-3 text-white" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsEditing(true)
                  setEditValue(tag.tag.name)
                }}
                className="p-1 bg-white rounded-full"
                title="Edit name"
              >
                <Edit2 className="w-3 h-3 text-gray-700" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

interface ObjectBoxProps {
  tag: ObjectTag
  rotation: number
}

function ObjectBox({ tag, rotation }: ObjectBoxProps) {
  const transformed = transformBoxCoords(
    tag.positionX,
    tag.positionY,
    tag.sizeX,
    tag.sizeY,
    rotation
  )

  const left = `${(transformed.posX - transformed.sizeX / 2) * 100}%`
  const top = `${(transformed.posY - transformed.sizeY / 2) * 100}%`
  const width = `${transformed.sizeX * 100}%`
  const height = `${transformed.sizeY * 100}%`

  return (
    <div
      className="absolute border-2 border-red-500/75 rounded"
      style={{ left, top, width, height }}
    >
      <div
        className="absolute top-0 left-0"
        style={{ transform: `rotate(${360 - rotation}deg)`, transformOrigin: 'top left' }}
      >
        <span className="text-xs px-1 py-0.5 bg-red-500/50 text-white rounded-sm whitespace-nowrap">
          {tag.tag.name}
        </span>
      </div>
    </div>
  )
}

export function BoundingBoxes({
  personTags,
  objectTags,
  rotation,
  visible,
  onRefetch,
}: BoundingBoxesProps) {
  const [editFaceTag] = useMutation(EDIT_FACE_TAG)
  const [blockFaceTag] = useMutation(BLOCK_FACE_TAG)
  const [verifyFaceTag] = useMutation(VERIFY_FACE_TAG)

  const handleEdit = useCallback(
    async (tagId: string, newName: string) => {
      try {
        const result = await editFaceTag({
          variables: { photoTagId: tagId, newName },
        })
        if (result.data?.editFaceTag?.ok) {
          onRefetch?.()
        }
      } catch (e) {
        console.error('Failed to edit face tag:', e)
      }
    },
    [editFaceTag, onRefetch]
  )

  const handleBlock = useCallback(
    async (tagId: string) => {
      try {
        const result = await blockFaceTag({
          variables: { photoTagId: tagId },
        })
        if (result.data?.blockFaceTag?.ok) {
          onRefetch?.()
        }
      } catch (e) {
        console.error('Failed to block face tag:', e)
      }
    },
    [blockFaceTag, onRefetch]
  )

  const handleVerify = useCallback(
    async (tagId: string) => {
      try {
        const result = await verifyFaceTag({
          variables: { photoTagId: tagId },
        })
        if (result.data?.verifyPhoto?.ok) {
          onRefetch?.()
        }
      } catch (e) {
        console.error('Failed to verify face tag:', e)
      }
    },
    [verifyFaceTag, onRefetch]
  )

  if (!visible) return null

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="relative w-full h-full pointer-events-auto">
        {/* Face boxes */}
        {personTags.map((tag) => (
          <FaceBox
            key={tag.id}
            tag={tag}
            rotation={rotation}
            onEdit={handleEdit}
            onBlock={handleBlock}
            onVerify={handleVerify}
          />
        ))}

        {/* Object boxes */}
        {objectTags.map((tag) => (
          <ObjectBox key={tag.id} tag={tag} rotation={rotation} />
        ))}
      </div>
    </div>
  )
}
