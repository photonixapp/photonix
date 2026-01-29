import { gql } from '@apollo/client'
import type { TypedDocumentNode } from '@apollo/client'
import type {
  GetPhotoResponse,
  SaveRotationResponse,
  EditFaceTagResponse,
  BlockFaceTagResponse,
  VerifyFaceTagResponse,
  CreateGenericTagResponse,
  RemoveGenericTagResponse,
  PhotosAroundResponse,
} from './detail-types'

// Query for full photo details
export const GET_PHOTO: TypedDocumentNode<GetPhotoResponse, { id: string }> = gql`
  query GetPhoto($id: UUID!) {
    photo(id: $id) {
      id
      width
      height
      rotation
      userRotation
      downloadUrl
      location
      takenAt
      aperture
      exposure
      isoSpeed
      focalLength
      flash
      meteringMode
      driveMode
      shootingMode
      starRating
      camera {
        id
        make
        model
      }
      lens {
        id
        name
      }
      locationTags {
        tag {
          id
          name
          parent {
            id
          }
        }
      }
      objectTags {
        id
        tag {
          name
        }
        positionX
        positionY
        sizeX
        sizeY
      }
      personTags {
        id
        tag {
          name
        }
        positionX
        positionY
        sizeX
        sizeY
        verified
        deleted
        showVerifyIcon
      }
      colorTags {
        tag {
          name
        }
        significance
      }
      styleTags {
        tag {
          name
        }
      }
      eventTags {
        tag {
          name
        }
      }
      genericTags {
        tag {
          id
          name
        }
      }
      photoFile {
        id
        path
      }
      baseFileId
    }
  }
`

// Mutation to save photo rotation
export const SAVE_ROTATION: TypedDocumentNode<
  SaveRotationResponse,
  { photoFileId: string; rotation: number }
> = gql`
  mutation SavePhotoFileRotation($photoFileId: ID!, $rotation: Int!) {
    savePhotofileRotation(photoFileId: $photoFileId, rotation: $rotation) {
      ok
      rotation
    }
  }
`

// Mutation to edit face tag name
export const EDIT_FACE_TAG: TypedDocumentNode<
  EditFaceTagResponse,
  { photoTagId: string; newName: string }
> = gql`
  mutation EditFaceTag($photoTagId: ID!, $newName: String!) {
    editFaceTag(photoTagId: $photoTagId, newName: $newName) {
      ok
    }
  }
`

// Mutation to block/reject face tag
export const BLOCK_FACE_TAG: TypedDocumentNode<
  BlockFaceTagResponse,
  { photoTagId: string }
> = gql`
  mutation BlockFaceTag($photoTagId: ID!) {
    blockFaceTag(photoTagId: $photoTagId) {
      ok
    }
  }
`

// Mutation to verify face tag
export const VERIFY_FACE_TAG: TypedDocumentNode<
  VerifyFaceTagResponse,
  { photoTagId: string }
> = gql`
  mutation VerifyFaceTag($photoTagId: ID!) {
    verifyPhoto(photoTagId: $photoTagId) {
      ok
    }
  }
`

// Mutation to create generic tag
export const CREATE_GENERIC_TAG: TypedDocumentNode<
  CreateGenericTagResponse,
  { name: string; photoId: string }
> = gql`
  mutation CreateGenericTag($name: String!, $photoId: ID!) {
    createGenericTag(name: $name, photoId: $photoId) {
      ok
      photoTagId
      tagId
      name
    }
  }
`

// Mutation to remove generic tag
export const REMOVE_GENERIC_TAG: TypedDocumentNode<
  RemoveGenericTagResponse,
  { tagId: string; photoId: string }
> = gql`
  mutation RemoveGenericTag($tagId: ID!, $photoId: ID!) {
    removeGenericTag(tagId: $tagId, photoId: $photoId) {
      ok
    }
  }
`

// Query for photos around a specific photo (for navigation when directly landing on photo detail)
export const GET_PHOTOS_AROUND: TypedDocumentNode<
  PhotosAroundResponse,
  { photoId: string; count?: number }
> = gql`
  query GetPhotosAround($photoId: UUID!, $count: Int) {
    photosAround(photoId: $photoId, count: $count) {
      photoIds
      rotations
      currentIndex
    }
  }
`
