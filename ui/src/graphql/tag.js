import gql from "graphql-tag"

export const CREATE_TAG = gql`
  mutation createGenericTag(
    $name: String!,
    $photoId: ID!
  ) {
    createGenericTag(name: $name, photoId: $photoId) {
      ok
      photoTagId
      tagId
      name
    }
  }
`
export const REMOVE_TAG = gql`
  mutation removeGenericTag(
    $tagId: ID!,
    $photoId: ID!
  ) {
    removeGenericTag(tagId:$tagId, photoId:$photoId) {
      ok
    }
  }
`
export const EDIT_FACE_TAG = gql`
  mutation editFaceTag(
    $photoTagId: ID!,
    $newName: String!,
  ) {
    editFaceTag(photoTagId:$photoTagId, newName:$newName) {
      ok
    }
  }
`
export const BLOCK_FACE_TAG = gql`
  mutation blockFaceTag(
    $photoTagId: ID!,
  ) {
    blockFaceTag(photoTagId:$photoTagId) {
      ok
    }
  }
`
export const VERIFY_FACE_TAG = gql`
  mutation verifyPhoto(
    $photoTagId: ID!,
  ) {
    verifyPhoto(photoTagId:$photoTagId) {
      ok
    }
  }
`
export const ASSIGN_TAG_TO_PHOTOS = gql`
  mutation assignTagToPhotos(
    $name: String!,
    $photoIds: String!,
    $tagType: String!
  ) {
    assignTagToPhotos(name: $name, photoIds: $photoIds, tagType: $tagType) {
      ok
    }
  }
`
export const SET_PHOTOS_DELETED = gql`
  mutation setPhotosDeleted(
    $photoIds: String!,
  ) {
    setPhotosDeleted(photoIds: $photoIds) {
      ok
    }
  }
`
export const REMOVE_PHOTOS_FROM_ALBUM = gql`
  mutation removePhotosFromAlbum(
    $photoIds: String!,
    $albumId: String!,
  ) {
    removePhotosFromAlbum(photoIds: $photoIds, albumId: $albumId) {
      ok
    }
  }
`