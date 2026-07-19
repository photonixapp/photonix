import { useEffect, useState } from 'react'
import { useQuery, useApolloClient } from '@apollo/client/react'
import type { DocumentNode } from '@apollo/client'
import { Bell, Pause, Play } from 'lucide-react'
import { useLibrariesStore } from '../../lib/libraries'
import {
  GET_TASK_PROGRESS,
  type TaskCount,
} from '../../lib/notifications/graphql'
import { useTaskPeaksStore } from '../../lib/notifications/peaks-store'
import {
  GET_LIBRARY_SETTING,
  UPDATE_COLOR_ENABLED,
  UPDATE_OBJECT_ENABLED,
  UPDATE_LOCATION_ENABLED,
  UPDATE_STYLE_ENABLED,
  UPDATE_FACE_ENABLED,
  UPDATE_EVENT_ENABLED,
  UPDATE_CLIP_ENABLED,
  type LibrarySettingData,
} from '../../lib/settings/graphql'

type TaskKey =
  | 'generateThumbnails'
  | 'processRaw'
  | 'classifyColor'
  | 'classifyObject'
  | 'classifyLocation'
  | 'classifyStyle'
  | 'classifyFace'
  | 'classifyEvent'
  | 'classifyClip'

interface TaskConfig {
  key: TaskKey
  title: string
  settingKey?: keyof LibrarySettingData
  mutation?: DocumentNode
}

const TASKS: TaskConfig[] = [
  { key: 'generateThumbnails', title: 'Generating thumbnails' },
  { key: 'processRaw', title: 'Processing raw files' },
  {
    key: 'classifyColor',
    title: 'Analyzing colors',
    settingKey: 'classificationColorEnabled',
    mutation: UPDATE_COLOR_ENABLED,
  },
  {
    key: 'classifyObject',
    title: 'Analyzing objects',
    settingKey: 'classificationObjectEnabled',
    mutation: UPDATE_OBJECT_ENABLED,
  },
  {
    key: 'classifyLocation',
    title: 'Analyzing locations',
    settingKey: 'classificationLocationEnabled',
    mutation: UPDATE_LOCATION_ENABLED,
  },
  {
    key: 'classifyStyle',
    title: 'Analyzing styles',
    settingKey: 'classificationStyleEnabled',
    mutation: UPDATE_STYLE_ENABLED,
  },
  {
    key: 'classifyFace',
    title: 'Analyzing faces',
    settingKey: 'classificationFaceEnabled',
    mutation: UPDATE_FACE_ENABLED,
  },
  {
    key: 'classifyEvent',
    title: 'Detecting events',
    settingKey: 'classificationEventEnabled',
    mutation: UPDATE_EVENT_ENABLED,
  },
  {
    key: 'classifyClip',
    title: 'Indexing for semantic search',
    settingKey: 'classificationClipEnabled',
    mutation: UPDATE_CLIP_ENABLED,
  },
]

function remainingOf(count: TaskCount | null | undefined): number {
  return count?.remaining ?? 0
}

export function Notifications() {
  const client = useApolloClient()
  const { activeLibraryId } = useLibrariesStore()
  const [isOpen, setIsOpen] = useState(false)

  const { data } = useQuery(GET_TASK_PROGRESS, {
    pollInterval: isOpen ? 3000 : 15000,
    fetchPolicy: 'network-only',
  })

  const { data: settingData, refetch: refetchSettings } = useQuery(
    GET_LIBRARY_SETTING,
    {
      variables: { libraryId: activeLibraryId! },
      skip: !activeLibraryId,
    }
  )
  const library = settingData?.librarySetting?.library

  const progress = data?.taskProgress
  const peaks = useTaskPeaksStore((s) => s.peaks)
  const recordPeak = useTaskPeaksStore((s) => s.record)

  // Record the peak remaining per task as new poll data arrives so we can show
  // a determinate progress bar.
  useEffect(() => {
    if (!progress) return
    for (const task of TASKS) {
      recordPeak(task.key, remainingOf(progress[task.key]))
    }
  }, [progress, recordPeak])

  const activeTasks = TASKS.map((task) => {
    const remaining = remainingOf(progress?.[task.key])
    const total = Math.max(peaks[task.key] ?? 0, remaining)
    const percent = total > 0 ? ((total - remaining) / total) * 100 : 0
    return { ...task, remaining, total, percent }
  }).filter((t) => t.remaining > 0)

  const hasActive = activeTasks.length > 0

  const toggleClassifier = async (task: TaskConfig) => {
    if (!task.settingKey || !task.mutation || !activeLibraryId || !library) return
    const newValue = !library[task.settingKey]
    await client.mutate({
      mutation: task.mutation,
      variables: { value: newValue, libraryId: activeLibraryId },
    })
    refetchSettings()
  }

  // Hide the bell entirely when there's nothing in progress.
  if (!hasActive && !isOpen) return null

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="relative p-2.5 cursor-pointer hover:bg-white/10 transition-colors"
        aria-label="Background task progress"
        data-testid="notifications-button"
      >
        <Bell className="w-6 h-6 text-white/90" />
        {hasActive && (
          <span
            className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-teal-500"
            data-testid="notifications-indicator"
          />
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-[50px] w-[320px] bg-[#444] shadow-[-3px_8px_17px_rgba(0,0,0,0.15)] z-10 p-4"
          data-testid="notifications-panel"
        >
          {!hasActive && (
            <p className="text-sm text-neutral-400">No tasks running.</p>
          )}
          <ul className="space-y-3">
            {activeTasks.map((task) => (
              <li key={task.key} data-testid={`task-${task.key}`}>
                <div className="flex items-center justify-between text-sm text-neutral-200">
                  <span>{task.title}</span>
                  <span className="flex items-center gap-2">
                    <span
                      className="text-neutral-400 tabular-nums"
                      data-testid={`task-remaining-${task.key}`}
                    >
                      {task.total - task.remaining}/{task.total}
                    </span>
                    {task.settingKey && (
                      <button
                        onClick={() => toggleClassifier(task)}
                        className="rounded p-0.5 text-neutral-300 hover:bg-white/10 hover:text-white"
                        aria-label={
                          library?.[task.settingKey]
                            ? 'Pause classifier'
                            : 'Resume classifier'
                        }
                        data-testid={`task-toggle-${task.key}`}
                      >
                        {library?.[task.settingKey] ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-neutral-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-teal-500 transition-all duration-500"
                    style={{ width: `${task.percent}%` }}
                    data-testid={`task-bar-${task.key}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
