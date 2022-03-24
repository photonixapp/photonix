import gql from 'graphql-tag'

export const GET_TASK_PROGRESS = gql`
  query TaskProgress {
    taskProgress {
      generateThumbnails
      processRaw
      classifyColor
      classifyObject
      classifyLocation
      classifyStyle
      classifyFace
    }
  }
`
