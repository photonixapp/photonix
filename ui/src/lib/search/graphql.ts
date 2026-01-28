import { gql } from '@apollo/client'
import type { TypedDocumentNode } from '@apollo/client'

// Response types
export interface TagItem {
  id: string
  name: string
  parent?: { id: string } | null
}

export interface CameraItem {
  id: string
  make: string
  model: string
}

export interface LensItem {
  id: string
  name: string
}

export interface AllFiltersResponse {
  allLocationTags: TagItem[]
  allObjectTags: TagItem[]
  allPersonTags: TagItem[]
  allColorTags: TagItem[]
  allStyleTags: TagItem[]
  allEventTags: TagItem[]
  allGenericTags: TagItem[]
  allCameras: CameraItem[]
  allLenses: LensItem[]
}

export interface AllFiltersVariables {
  libraryId: string
  multiFilter?: string
}

export const GET_ALL_FILTERS: TypedDocumentNode<
  AllFiltersResponse,
  AllFiltersVariables
> = gql`
  query AllFilters($libraryId: UUID!, $multiFilter: String) {
    allLocationTags(libraryId: $libraryId, multiFilter: $multiFilter) {
      id
      name
      parent {
        id
      }
    }
    allObjectTags(libraryId: $libraryId, multiFilter: $multiFilter) {
      id
      name
    }
    allPersonTags(libraryId: $libraryId, multiFilter: $multiFilter) {
      id
      name
    }
    allColorTags(libraryId: $libraryId, multiFilter: $multiFilter) {
      id
      name
    }
    allStyleTags(libraryId: $libraryId, multiFilter: $multiFilter) {
      id
      name
    }
    allEventTags(libraryId: $libraryId, multiFilter: $multiFilter) {
      id
      name
    }
    allGenericTags(libraryId: $libraryId, multiFilter: $multiFilter) {
      id
      name
    }
    allCameras(libraryId: $libraryId) {
      id
      make
      model
    }
    allLenses(libraryId: $libraryId) {
      id
      name
    }
  }
`
