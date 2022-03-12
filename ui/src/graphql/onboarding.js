import gql from 'graphql-tag'

export const ENVIRONMENT = gql`
  {
    environment {
      demo
      firstRun
      form
      userId
      libraryId
      libraryPathId
    }
  }
`
export const STEP_ONE = gql`
  mutation($username: String!, $password: String!, $password1: String!) {
    createUser(
      username: $username
      password: $password
      password1: $password1
    ) {
      hasSetPersonalInfo
      userId
    }
  }
`

export const STEP_THREES3 = gql`
  mutation(
    $name: String!
    $backendType: String!
    $path: String!
    $url: String!
    $s3SecretKey: String!
    $s3AccessKeyId: String!
    $userId: ID!
  ) {
    createLibrary(
      input: {
        name: $name
        backendType: $backendType
        path: $path
        url: $url
        s3SecretKey: $s3SecretKey
        s3AccessKeyId: $s3AccessKeyId
        userId: $userId
      }
    ) {
      hasCreatedLibrary
      userId
      libraryId
      libraryPathId
    }
  }
`

export const STEP_THREELO = gql`
  mutation(
    $name: String!
    $backendType: String!
    $path: String!
    $userId: ID!
  ) {
    createLibrary(
      input: {
        name: $name
        backendType: $backendType
        path: $path
        userId: $userId
      }
    ) {
      hasCreatedLibrary
      userId
      libraryId
      libraryPathId
    }
  }
`

export const STEP_FOUR = gql`
  mutation(
    $watchForChanges: Boolean!
    $addAnotherPath: Boolean!
    $userId: ID!
    $libraryId: ID!
    $libraryPathId: ID!
  ) {
    PhotoImporting(
      input: {
        watchForChanges: $watchForChanges
        addAnotherPath: $addAnotherPath
        userId: $userId
        libraryId: $libraryId
        libraryPathId: $libraryPathId
      }
    ) {
      hasConfiguredImporting
      userId
      libraryId
    }
  }
`

export const STEP_FOUR_AP = gql`
  mutation(
    $watchForChanges: Boolean!
    $addAnotherPath: Boolean!
    $importPath: String!
    $deleteAfterImport: Boolean!
    $userId: ID!
    $libraryId: ID!
    $libraryPathId: ID!
  ) {
    PhotoImporting(
      input: {
        watchForChanges: $watchForChanges
        addAnotherPath: $addAnotherPath
        importPath: $importPath
        deleteAfterImport: $deleteAfterImport
        userId: $userId
        libraryId: $libraryId
        libraryPathId: $libraryPathId
      }
    ) {
      hasConfiguredImporting
      userId
      libraryId
    }
  }
`

export const STEP_FIVE = gql`
  mutation(
    $classificationColorEnabled: Boolean!
    $classificationStyleEnabled: Boolean!
    $classificationObjectEnabled: Boolean!
    $classificationLocationEnabled: Boolean!
    $classificationFaceEnabled: Boolean!
    $userId: ID!
    $libraryId: ID!
  ) {
    imageAnalysis(
      input: {
        classificationColorEnabled: $classificationColorEnabled
        classificationStyleEnabled: $classificationStyleEnabled
        classificationObjectEnabled: $classificationObjectEnabled
        classificationLocationEnabled: $classificationLocationEnabled
        classificationFaceEnabled: $classificationFaceEnabled
        userId: $userId
        libraryId: $libraryId
      }
    ) {
      hasConfiguredImageAnalysis
      userId
    }
  }
`
export const SIGN_IN = gql`
  {
    afterSignup {
      token
      refreshToken
    }
  }
`
