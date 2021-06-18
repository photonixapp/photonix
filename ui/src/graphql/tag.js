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