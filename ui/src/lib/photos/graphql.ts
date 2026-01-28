import { gql } from '@apollo/client'
import type { TypedDocumentNode } from '@apollo/client'
import type { AllPhotosResponse, PhotoRatingResponse } from './types'

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
