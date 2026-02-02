import { useState, useEffect, useRef } from 'react'
import { useMutation } from '@apollo/client/react'
import { X } from 'lucide-react'
import { CREATE_GENERIC_TAG, REMOVE_GENERIC_TAG } from '../../lib/photos/detail-graphql'
import type { GenericTag } from '../../lib/photos/detail-types'

interface EditableTagsProps {
  tags: GenericTag[]
  editorMode: boolean
  photoId: string
  onTagsUpdated: () => void
}

export function EditableTags({
  tags,
  editorMode,
  photoId,
  onTagsUpdated,
}: EditableTagsProps) {
  const [newTag, setNewTag] = useState('')
  const [tagsList, setTagsList] = useState<GenericTag[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const [createTag] = useMutation(CREATE_GENERIC_TAG)
  const [removeTag] = useMutation(REMOVE_GENERIC_TAG)

  useEffect(() => {
    setTagsList(tags)
  }, [tags])

  useEffect(() => {
    if (editorMode && inputRef.current) {
      inputRef.current.focus()
      // Scroll the sidebar to show the input
      inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [editorMode, tagsList])

  const submitTag = () => {
    if (!newTag.trim()) return

    createTag({
      variables: {
        photoId,
        name: newTag.trim(),
      },
    })
      .then((result) => {
        if (result.data?.createGenericTag.ok) {
          setNewTag('')
          onTagsUpdated()
        }
      })
      .catch(() => {
        // Handle error silently
      })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submitTag()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && newTag.trim()) {
      e.preventDefault()
      submitTag()
    }
  }

  const deleteTag = (tagId: string) => {
    removeTag({
      variables: {
        tagId,
        photoId,
      },
    })
      .then((result) => {
        if (result.data?.removeGenericTag.ok) {
          onTagsUpdated()
        }
      })
      .catch(() => {
        // Handle error silently
      })
  }

  return (
    <div>
      <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
        {tagsList.map((photoTag) => (
          <li
            key={photoTag.tag.id}
            className={`
              inline-flex items-center gap-1
              bg-neutral-700 text-neutral-200
              text-sm rounded
              ${editorMode ? 'py-1 pl-2 pr-1' : 'py-1 px-2'}
            `}
          >
            <span>{photoTag.tag.name}</span>
            {editorMode && (
              <button
                onClick={() => deleteTag(photoTag.tag.id)}
                className="p-0.5 hover:bg-white/20 rounded transition-colors opacity-60 hover:opacity-100 cursor-pointer"
                title={`Remove tag "${photoTag.tag.name}"`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {editorMode && (
        <form onSubmit={handleSubmit} className="mt-3">
          <input
            ref={inputRef}
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="New tag"
            className={`
              w-full bg-neutral-800 border border-neutral-700
              text-sm text-white rounded px-3 py-2
              placeholder:text-neutral-500
              focus:outline-none focus:border-neutral-500
              transition-opacity
              ${newTag.length > 0 ? 'opacity-100' : 'opacity-60'}
            `}
          />
        </form>
      )}

      {!editorMode && tagsList.length === 0 && (
        <span className="text-white/40 text-sm">No tags</span>
      )}
    </div>
  )
}
