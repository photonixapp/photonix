import { gql } from '@apollo/client'
import type { TypedDocumentNode } from '@apollo/client'
import type {
  AllPhotosResponse,
  PhotoRatingResponse,
  SemanticSearchResponse,
} from './types'

export const GET_PHOTOS: TypedDocumentNode<
  AllPhotosResponse,
  { filters: string; after?: string; first: number }
> = gql`
  query Photos($filters: String, $after: String, $first: Int) {
    allPhotos(multiFilter: $filters, first: $first, after: $after) {
      pageInfo {
        endCursor
        hasNextPage
        hasPreviousPage
      }
      edges {
        cursor
        node {
          id
          location
          starRating
          rotation
        }
      }
    }
  }
`

export const UPDATE_PHOTO_RATING: TypedDocumentNode<
  PhotoRatingResponse,
  { photoId: string; starRating: number }
> = gql`
  mutation PhotoRating($photoId: ID!, $starRating: Int!) {
    photoRating(photoId: $photoId, starRating: $starRating) {
      photo {
        starRating
      }
    }
  }
`

export const PHOTOS_PER_PAGE = 100

// Natural-language (CLIP) semantic search. Returns photos ranked by cosine
// similarity to the query; no pagination cursor - the backend caps the count.
export const SEMANTIC_SEARCH_PHOTOS: TypedDocumentNode<
  SemanticSearchResponse,
  { libraryId: string; query: string; first?: number }
> = gql`
  query SemanticSearchPhotos($libraryId: UUID!, $query: String!, $first: Int) {
    semanticSearchPhotos(libraryId: $libraryId, query: $query, first: $first) {
      photo {
        id
        starRating
        rotation
      }
      score
    }
  }
`
