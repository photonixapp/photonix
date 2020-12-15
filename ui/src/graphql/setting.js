import gql from "graphql-tag"
export const SETTINGS_STYLE = gql`
mutation updateStyleEnabled(
   $classificationStyleEnabled: Boolean!,
   ) {
    updateStyleEnabled(input:{classificationStyleEnabled: $classificationStyleEnabled}) {
      classificationStyleEnabled
    }
}
`
export const SETTINGS_COLOR = gql`
mutation updateColorEnabled(
   $classificationColorEnabled: Boolean!,
   ) {
    updateColorEnabled(input:{classificationColorEnabled: $classificationColorEnabled}) {
      classificationColorEnabled
    }
}
`
export const SETTINGS_LOCATION = gql`
mutation updateLocationEnabled(
   $classificationLocationEnabled: Boolean!,
   ) {
    updateLocationEnabled(input:{classificationLocationEnabled: $classificationLocationEnabled}) {
      classificationLocationEnabled
    }
}
`
export const SETTINGS_OBJECT = gql`
mutation updateObjectEnabled(
   $classificationObjectEnabled: Boolean!,
   ) {
    updateObjectEnabled(input:{classificationObjectEnabled: $classificationObjectEnabled}) {
      classificationObjectEnabled
    }
}
`
export const SETTINGS_SOURCE_FOLDER = gql`
mutation updateSourceFolder(
   $sourceFolder: String!,
   ) {
    updateSourceFolder(input:{sourceFolder: $sourceFolder}) {
      sourceFolder
    }
}
`

export const GET_SETTINGS = gql`
{
  librarySetting{
    library{
      name
      classificationColorEnabled
      classificationStyleEnabled
      classificationObjectEnabled
      classificationLocationEnabled
    },
    sourceFolder
  }
}
`