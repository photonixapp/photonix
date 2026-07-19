import { useMemo, useState } from 'react'
import { useQuery, useApolloClient } from '@apollo/client/react'
import type { DocumentNode } from '@apollo/client'
import { Modal, Switch } from '../ui'
import { useLibrariesStore } from '../../lib/libraries'
import {
  GET_LIBRARY_SETTING,
  UPDATE_COLOR_ENABLED,
  UPDATE_LOCATION_ENABLED,
  UPDATE_FACE_ENABLED,
  UPDATE_STYLE_ENABLED,
  UPDATE_OBJECT_ENABLED,
  UPDATE_EVENT_ENABLED,
  UPDATE_CLIP_ENABLED,
  UPDATE_WATCH_PHOTOS,
} from '../../lib/settings/graphql'
import { addToast } from '../../lib/ui/store'

interface SettingsModalProps {
  onClose: () => void
}

type SettingKey =
  | 'watchPhotos'
  | 'classificationColorEnabled'
  | 'classificationLocationEnabled'
  | 'classificationFaceEnabled'
  | 'classificationStyleEnabled'
  | 'classificationObjectEnabled'
  | 'classificationEventEnabled'
  | 'classificationClipEnabled'

const TOGGLES: {
  key: SettingKey
  label: string
  description?: string
  mutation: DocumentNode
}[] = [
  {
    key: 'watchPhotos',
    label: 'Watch folder for new photos',
    mutation: UPDATE_WATCH_PHOTOS,
  },
  {
    key: 'classificationColorEnabled',
    label: 'Run color analysis on photos',
    mutation: UPDATE_COLOR_ENABLED,
  },
  {
    key: 'classificationLocationEnabled',
    label: 'Run location detection on photos',
    mutation: UPDATE_LOCATION_ENABLED,
  },
  {
    key: 'classificationFaceEnabled',
    label: 'Run face recognition on photos',
    mutation: UPDATE_FACE_ENABLED,
  },
  {
    key: 'classificationStyleEnabled',
    label: 'Run style classification on photos',
    mutation: UPDATE_STYLE_ENABLED,
  },
  {
    key: 'classificationObjectEnabled',
    label: 'Run object detection on photos',
    mutation: UPDATE_OBJECT_ENABLED,
  },
  {
    key: 'classificationEventEnabled',
    label: 'Run event detection on photos',
    mutation: UPDATE_EVENT_ENABLED,
  },
  {
    key: 'classificationClipEnabled',
    label: 'Semantic search (CLIP)',
    description:
      'Search photos by describing them in natural language. Downloads a ~340 MB model.',
    mutation: UPDATE_CLIP_ENABLED,
  },
]

export function SettingsModal({ onClose }: SettingsModalProps) {
  const client = useApolloClient()
  const { activeLibraryId, getActiveLibrary } = useLibrariesStore()
  const activeLibrary = getActiveLibrary()

  const { data } = useQuery(GET_LIBRARY_SETTING, {
    variables: { libraryId: activeLibraryId! },
    skip: !activeLibraryId,
    fetchPolicy: 'cache-and-network',
  })

  // Server-provided values; local optimistic overrides layer on top so we can
  // flip a toggle instantly without a setState-in-effect hydration step.
  const serverSettings = useMemo<Record<SettingKey, boolean>>(() => {
    const s = data?.librarySetting
    const lib = s?.library
    return {
      watchPhotos: !!s?.watchPhotos,
      classificationColorEnabled: !!lib?.classificationColorEnabled,
      classificationLocationEnabled: !!lib?.classificationLocationEnabled,
      classificationFaceEnabled: !!lib?.classificationFaceEnabled,
      classificationStyleEnabled: !!lib?.classificationStyleEnabled,
      classificationObjectEnabled: !!lib?.classificationObjectEnabled,
      classificationEventEnabled: !!lib?.classificationEventEnabled,
      classificationClipEnabled: !!lib?.classificationClipEnabled,
    }
  }, [data])

  const [overrides, setOverrides] = useState<Partial<Record<SettingKey, boolean>>>(
    {}
  )

  const valueOf = (key: SettingKey) =>
    overrides[key] !== undefined ? overrides[key]! : serverSettings[key]

  const toggle = (key: SettingKey, mutation: DocumentNode) => {
    if (!activeLibraryId) return
    const newValue = !valueOf(key)
    setOverrides((prev) => ({ ...prev, [key]: newValue }))
    client
      .mutate({
        mutation,
        variables: { value: newValue, libraryId: activeLibraryId },
      })
      .catch(() => {
        // Revert on failure.
        setOverrides((prev) => ({ ...prev, [key]: !newValue }))
        addToast("Couldn't save setting")
      })
  }

  return (
    <Modal
      title="Settings"
      subtitle={activeLibrary?.name}
      onClose={onClose}
      data-testid="settings-modal"
    >
      <div className="space-y-4">
        {TOGGLES.map(({ key, label, description, mutation }) => (
          <Switch
            key={key}
            label={label}
            description={description}
            checked={valueOf(key)}
            onChange={() => toggle(key, mutation)}
            data-testid={`setting-${key}`}
          />
        ))}
      </div>
    </Modal>
  )
}
