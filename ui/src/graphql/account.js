import gql from "graphql-tag"

export const UPDATE_PASSWORD = gql`
  mutation changePassword (
    $oldPassword: String!,
    $newPassword: String!
  ) {
      changePassword(oldPassword:$oldPassword,newPassword:$newPassword) {
        ok
    }
  }
`