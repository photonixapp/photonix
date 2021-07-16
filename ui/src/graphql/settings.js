import gql from 'graphql-tag'

export const SETTINGS_STYLE = gql`
  mutation updateStyleEnabled(
    $classificationStyleEnabled: Boolean!
    $libraryId: ID
  ) {
    updateStyleEnabled(
      input: {
        classificationStyleEnabled: $classificationStyleEnabled
        libraryId: $libraryId
      }
    ) {
      classificationStyleEnabled
    }
  }
`
export const SETTINGS_COLOR = gql`
  mutation updateColorEnabled(
    $classificationColorEnabled: Boolean!
    $libraryId: ID
  ) {
    updateColorEnabled(
      input: {
        classificationColorEnabled: $classificationColorEnabled
        libraryId: $libraryId
      }
    ) {
      classificationColorEnabled
    }
  }
`
export const SETTINGS_LOCATION = gql`
  mutation updateLocationEnabled(
    $classificationLocationEnabled: Boolean!
    $libraryId: ID
  ) {
    updateLocationEnabled(
      input: {
        classificationLocationEnabled: $classificationLocationEnabled
        libraryId: $libraryId
      }
    ) {
      classificationLocationEnabled
    }
  }
`
export const SETTINGS_OBJECT = gql`
  mutation updateObjectEnabled(
    $classificationObjectEnabled: Boolean!
    $libraryId: ID
  ) {
    updateObjectEnabled(
      input: {
        classificationObjectEnabled: $classificationObjectEnabled
        libraryId: $libraryId
      }
    ) {
      classificationObjectEnabled
    }
  }
`
export const SETTINGS_FACE = gql`
  mutation updateFaceEnabled(
    $classificationFaceEnabled: Boolean!
    $libraryId: ID
  ) {
    updateFaceEnabled(
      input: {
        classificationFaceEnabled: $classificationFaceEnabled
        libraryId: $libraryId
      }
    ) {
      classificationFaceEnabled
    }
  }
`
export const SETTINGS_SOURCE_FOLDER = gql`
  mutation updateSourceFolder($sourceFolder: String!, $libraryId: ID) {
    updateSourceFolder(
      input: { sourceFolder: $sourceFolder, libraryId: $libraryId }
    ) {
      sourceFolder
    }
  }
`

export const GET_SETTINGS = gql`
  query LibrarySetting($libraryId: UUID) {
    librarySetting(libraryId: $libraryId) {
      library {
        name
        classificationColorEnabled
        classificationStyleEnabled
        classificationObjectEnabled
        classificationLocationEnabled
        classificationFaceEnabled
      }
      sourceFolder
    }
  }
`
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