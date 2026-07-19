import { gql } from '@apollo/client'
import type { TypedDocumentNode } from '@apollo/client'

// Each field is a GenericScalar shaped `{ remaining: number }` (count of
// Pending/Started Task rows for that task type). Absent/idle => remaining 0.
export interface TaskCount {
  remaining: number
}

export interface TaskProgressResponse {
  taskProgress: {
    generateThumbnails: TaskCount | null
    processRaw: TaskCount | null
    classifyColor: TaskCount | null
    classifyObject: TaskCount | null
    classifyLocation: TaskCount | null
    classifyStyle: TaskCount | null
    classifyFace: TaskCount | null
    classifyEvent: TaskCount | null
    classifyClip: TaskCount | null
  } | null
}

export const GET_TASK_PROGRESS: TypedDocumentNode<
  TaskProgressResponse,
  Record<string, never>
> = gql`
  query TaskProgress {
    taskProgress {
      generateThumbnails
      processRaw
      classifyColor
      classifyObject
      classifyLocation
      classifyStyle
      classifyFace
      classifyEvent
      classifyClip
    }
  }
`
