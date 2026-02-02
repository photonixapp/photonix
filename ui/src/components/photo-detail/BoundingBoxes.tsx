import { useState, useRef, useEffect, useCallback } from 'react'
import { useMutation } from '@apollo/client/react'
import { Edit2, X, Check } from 'lucide-react'
import {
  EDIT_FACE_TAG,
  BLOCK_FACE_TAG,
  VERIFY_FACE_TAG,
} from '../../lib/photos/detail-graphql'
import type { PersonTag, ObjectTag } from '../../lib/photos/detail-types'

// Shared view state for synchronizing with PhotoViewer
interface ViewState {
  scale: number
  offsetX: number
  offsetY: number
}

interface BoundingBoxesProps {
  personTags: PersonTag[]
  objectTags: ObjectTag[]
  rotation: number
  showPeopleBoxes: boolean
  showObjectBoxes: boolean
  onRefetch?: () => void
  // View state from PhotoViewer for zoom/pan synchronization
  viewState: ViewState
  imageWidth: number
  imageHeight: number
  viewportWidth: number
  viewportHeight: number
}

interface FaceBoxProps {
  tag: PersonTag
  rotation: number
  onEdit: (tagId: string, newName: string) => void
  onBlock: (tagId: string) => void
  onVerify: (tagId: string) => void
  // View state for positioning
  viewState: ViewState
  imageWidth: number
  imageHeight: number
  viewportWidth: number
  viewportHeight: number
}

function FaceBox({ tag, rotation, onEdit, onBlock, onVerify, viewState, imageWidth, imageHeight, viewportWidth, viewportHeight }: FaceBoxProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Classifier outputs coordinates in visual (post-rotation) space, so use directly
  const { positionX, positionY, sizeX, sizeY } = tag

  // Calculate position matching SyncedImageViewer exactly
  const { scale, offsetX, offsetY } = viewState
  const isRotated90or270 = rotation === 90 || rotation === 270

  // Use the same layout calculation as SyncedImageViewer
  const layoutWidth = isRotated90or270 ? imageHeight : imageWidth
  const layoutHeight = isRotated90or270 ? imageWidth : imageHeight

  const fitScale = Math.min(
    viewportWidth / layoutWidth,
    viewportHeight / layoutHeight
  )

  // Image element dimensions (before CSS rotation)
  const imgElemWidth = imageWidth * fitScale * scale
  const imgElemHeight = imageHeight * fitScale * scale

  // Visual dimensions after rotation
  const visualWidth = isRotated90or270 ? imgElemHeight : imgElemWidth
  const visualHeight = isRotated90or270 ? imgElemWidth : imgElemHeight

  // Calculate where the image ELEMENT is positioned (matching SyncedImageViewer)
  // Element is centered in viewport, CSS rotation preserves the center
  const elemLeft = (viewportWidth - imgElemWidth) / 2 + offsetX
  const elemTop = (viewportHeight - imgElemHeight) / 2 + offsetY

  // The element center = visual center (CSS rotation preserves center)
  const centerX = elemLeft + imgElemWidth / 2
  const centerY = elemTop + imgElemHeight / 2

  // Visual top-left after rotation
  const imgLeft = centerX - visualWidth / 2
  const imgTop = centerY - visualHeight / 2

  // Box position relative to the rotated image
  // Coordinates are in [0,1] normalized space of the visual (rotated) image
  const boxLeft = imgLeft + (positionX - sizeX / 2) * visualWidth
  const boxTop = imgTop + (positionY - sizeY / 2) * visualHeight
  const boxWidth = sizeX * visualWidth
  const boxHeight = sizeY * visualHeight

  const left = `${boxLeft}px`
  const top = `${boxTop}px`
  const width = `${boxWidth}px`
  const height = `${boxHeight}px`

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
      className="absolute pointer-events-auto"
      style={{ left, top, width, height }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* Border box with overflow-hidden for label clipping */}
      <div className={`absolute inset-0 border-2 rounded overflow-hidden ${borderColor}`}>
        {/* Label inside box with padding, matching object box style */}
        {!isEditing && !tag.deleted && (
          <div className="absolute top-0 left-0">
            <span className={`text-xs pt-10 pl-2 pr-2 pb-1 whitespace-nowrap ${labelBg}`}>
              {tag.tag.name}
            </span>
          </div>
        )}
      </div>

      {/* Controls positioned outside the overflow-hidden container */}
      {isEditing ? (
        <div className="absolute flex items-end gap-1" style={{ top: 0, left: 0 }}>
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="text-xs pt-1.5 pl-2 pr-2 pb-1 bg-yellow-400/50 text-gray-900 border-0 w-44 outline-none"
            placeholder={tag.tag.name}
          />
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleSave()
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1.5 bg-green-500 rounded-full shadow-lg hover:bg-green-600 transition-colors"
          >
            <Check className="w-3 h-3 text-white" />
          </button>
        </div>
      ) : (
        /* Action icons - positioned below label */
        <div className="absolute flex gap-1" style={{ top: 30, left: 5 }}>
          {!tag.verified && !tag.deleted && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onBlock(tag.id)
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-1.5 bg-red-500 rounded-full shadow-lg hover:bg-red-600 transition-colors cursor-pointer"
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
              onMouseDown={(e) => e.stopPropagation()}
              className="p-1.5 bg-green-500 rounded-full shadow-lg hover:bg-green-600 transition-colors cursor-pointer"
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
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1.5 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors cursor-pointer"
            title="Edit name"
          >
            <Edit2 className="w-3 h-3 text-gray-700" />
          </button>
        </div>
      )}
    </div>
  )
}

interface ObjectBoxProps {
  tag: ObjectTag
  rotation: number
  viewState: ViewState
  imageWidth: number
  imageHeight: number
  viewportWidth: number
  viewportHeight: number
}

function ObjectBox({ tag, rotation, viewState, imageWidth, imageHeight, viewportWidth, viewportHeight }: ObjectBoxProps) {
  // Classifier outputs coordinates in visual (post-rotation) space, so use directly
  const { positionX, positionY, sizeX, sizeY } = tag

  // Calculate position matching SyncedImageViewer exactly
  const { scale, offsetX, offsetY } = viewState
  const isRotated90or270 = rotation === 90 || rotation === 270

  const layoutWidth = isRotated90or270 ? imageHeight : imageWidth
  const layoutHeight = isRotated90or270 ? imageWidth : imageHeight

  const fitScale = Math.min(
    viewportWidth / layoutWidth,
    viewportHeight / layoutHeight
  )

  const imgElemWidth = imageWidth * fitScale * scale
  const imgElemHeight = imageHeight * fitScale * scale

  const visualWidth = isRotated90or270 ? imgElemHeight : imgElemWidth
  const visualHeight = isRotated90or270 ? imgElemWidth : imgElemHeight

  // Calculate where the image ELEMENT is positioned (matching SyncedImageViewer)
  // Element is centered in viewport, CSS rotation preserves the center
  const elemLeft = (viewportWidth - imgElemWidth) / 2 + offsetX
  const elemTop = (viewportHeight - imgElemHeight) / 2 + offsetY

  // The element center = visual center (CSS rotation preserves center)
  const centerX = elemLeft + imgElemWidth / 2
  const centerY = elemTop + imgElemHeight / 2

  // Visual top-left after rotation
  const imgLeft = centerX - visualWidth / 2
  const imgTop = centerY - visualHeight / 2

  // Box position relative to the rotated image
  // Coordinates are in [0,1] normalized space of the visual (rotated) image
  const boxLeft = imgLeft + (positionX - sizeX / 2) * visualWidth
  const boxTop = imgTop + (positionY - sizeY / 2) * visualHeight
  const boxWidth = sizeX * visualWidth
  const boxHeight = sizeY * visualHeight

  const left = `${boxLeft}px`
  const top = `${boxTop}px`
  const width = `${boxWidth}px`
  const height = `${boxHeight}px`

  return (
    <div
      className="absolute border-2 border-red-500/75 rounded overflow-hidden"
      style={{ left, top, width, height }}
    >
      <div className="absolute top-0 left-0">
        <span className="text-xs pt-10 pl-2 pr-2 pb-1 bg-red-500/50 text-white whitespace-nowrap">
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
  showPeopleBoxes,
  showObjectBoxes,
  onRefetch,
  viewState,
  imageWidth,
  imageHeight,
  viewportWidth,
  viewportHeight,
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

  if (!showPeopleBoxes && !showObjectBoxes) return null

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="relative w-full h-full">
        {/* Face boxes */}
        {showPeopleBoxes && personTags.map((tag) => (
          <FaceBox
            key={tag.id}
            tag={tag}
            rotation={rotation}
            onEdit={handleEdit}
            onBlock={handleBlock}
            onVerify={handleVerify}
            viewState={viewState}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            viewportWidth={viewportWidth}
            viewportHeight={viewportHeight}
          />
        ))}

        {/* Object boxes */}
        {showObjectBoxes && objectTags.map((tag) => (
          <ObjectBox
            key={tag.id}
            tag={tag}
            rotation={rotation}
            viewState={viewState}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            viewportWidth={viewportWidth}
            viewportHeight={viewportHeight}
          />
        ))}
      </div>
    </div>
  )
}
