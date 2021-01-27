import gql from "graphql-tag"

export const PHOTO_UPDATE = gql`
mutation photoRating(
   $photoId: ID!,$starRating:Int!,
   ) {
    photoRating(photoId: $photoId,starRating:$starRating) {
        photo {
          starRating
          aperture
          takenBy
          flash
        }
    }
}
`