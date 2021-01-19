import gql from "graphql-tag"

export const CREATE_TAG = gql`
  mutation createGenricTag(
    $name: String!,
    $photoId: ID!
  ) {
    createGenricTag(name: $name, photoId: $photoId) {
      ok
      photoTagId
      tagId
      name
    }
  }
`
export const REMOVE_TAG = gql`
  mutation removeGenricTag(
    $tagId: ID!,
    $photoId: ID!
  ) {
    removeGenricTag(tagId:$tagId, photoId:$photoId) {
      ok
    }
  }
`
