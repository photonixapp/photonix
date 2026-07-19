import { gql } from '@apollo/client'
import type { TypedDocumentNode } from '@apollo/client'

export interface LibrarySettingData {
  name: string
  classificationColorEnabled: boolean
  classificationLocationEnabled: boolean
  classificationFaceEnabled: boolean
  classificationStyleEnabled: boolean
  classificationObjectEnabled: boolean
  classificationEventEnabled: boolean
}

export interface LibrarySettingResponse {
  librarySetting: {
    library: LibrarySettingData
    sourceFolder: string | null
    watchPhotos: boolean | null
  } | null
}

export const GET_LIBRARY_SETTING: TypedDocumentNode<
  LibrarySettingResponse,
  { libraryId: string }
> = gql`
  query LibrarySetting($libraryId: UUID) {
    librarySetting(libraryId: $libraryId) {
      library {
        name
        classificationColorEnabled
        classificationLocationEnabled
        classificationFaceEnabled
        classificationStyleEnabled
        classificationObjectEnabled
        classificationEventEnabled
      }
      sourceFolder
      watchPhotos
    }
  }
`

// Each classifier toggle mutation shares the `input: { <field>, libraryId }`
// shape and echoes the updated field back.
export const UPDATE_COLOR_ENABLED: TypedDocumentNode<
  { updateColorEnabled: { classificationColorEnabled: boolean } },
  { value: boolean; libraryId: string }
> = gql`
  mutation UpdateColorEnabled($value: Boolean!, $libraryId: ID) {
    updateColorEnabled(
      input: { classificationColorEnabled: $value, libraryId: $libraryId }
    ) {
      classificationColorEnabled
    }
  }
`

export const UPDATE_LOCATION_ENABLED: TypedDocumentNode<
  { updateLocationEnabled: { classificationLocationEnabled: boolean } },
  { value: boolean; libraryId: string }
> = gql`
  mutation UpdateLocationEnabled($value: Boolean!, $libraryId: ID) {
    updateLocationEnabled(
      input: { classificationLocationEnabled: $value, libraryId: $libraryId }
    ) {
      classificationLocationEnabled
    }
  }
`

export const UPDATE_FACE_ENABLED: TypedDocumentNode<
  { updateFaceEnabled: { classificationFaceEnabled: boolean } },
  { value: boolean; libraryId: string }
> = gql`
  mutation UpdateFaceEnabled($value: Boolean!, $libraryId: ID) {
    updateFaceEnabled(
      input: { classificationFaceEnabled: $value, libraryId: $libraryId }
    ) {
      classificationFaceEnabled
    }
  }
`

export const UPDATE_STYLE_ENABLED: TypedDocumentNode<
  { updateStyleEnabled: { classificationStyleEnabled: boolean } },
  { value: boolean; libraryId: string }
> = gql`
  mutation UpdateStyleEnabled($value: Boolean!, $libraryId: ID) {
    updateStyleEnabled(
      input: { classificationStyleEnabled: $value, libraryId: $libraryId }
    ) {
      classificationStyleEnabled
    }
  }
`

export const UPDATE_OBJECT_ENABLED: TypedDocumentNode<
  { updateObjectEnabled: { classificationObjectEnabled: boolean } },
  { value: boolean; libraryId: string }
> = gql`
  mutation UpdateObjectEnabled($value: Boolean!, $libraryId: ID) {
    updateObjectEnabled(
      input: { classificationObjectEnabled: $value, libraryId: $libraryId }
    ) {
      classificationObjectEnabled
    }
  }
`

export const UPDATE_EVENT_ENABLED: TypedDocumentNode<
  { updateEventEnabled: { classificationEventEnabled: boolean } },
  { value: boolean; libraryId: string }
> = gql`
  mutation UpdateEventEnabled($value: Boolean!, $libraryId: ID) {
    updateEventEnabled(
      input: { classificationEventEnabled: $value, libraryId: $libraryId }
    ) {
      classificationEventEnabled
    }
  }
`

export const UPDATE_WATCH_PHOTOS: TypedDocumentNode<
  { updateWatchPhotos: { ok: boolean; watchPhotos: boolean } },
  { value: boolean; libraryId: string }
> = gql`
  mutation UpdateWatchPhotos($value: Boolean!, $libraryId: ID) {
    updateWatchPhotos(input: { watchPhotos: $value, libraryId: $libraryId }) {
      ok
      watchPhotos
    }
  }
`
