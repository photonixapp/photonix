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
