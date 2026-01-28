import { gql } from '@apollo/client'

export const ENVIRONMENT = gql`
  query Environment {
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

export const CREATE_USER = gql`
  mutation CreateUser($username: String!, $password: String!, $password1: String!) {
    createUser(username: $username, password: $password, password1: $password1) {
      hasSetPersonalInfo
      userId
    }
  }
`

export const CREATE_LIBRARY_LOCAL = gql`
  mutation CreateLibraryLocal(
    $name: String!
    $backendType: String!
    $path: String!
    $userId: ID!
  ) {
    createLibrary(
      input: { name: $name, backendType: $backendType, path: $path, userId: $userId }
    ) {
      hasCreatedLibrary
      userId
      libraryId
      libraryPathId
    }
  }
`

export const CREATE_LIBRARY_S3 = gql`
  mutation CreateLibraryS3(
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

export const CONFIGURE_PHOTO_IMPORTING = gql`
  mutation ConfigurePhotoImporting(
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

export const CONFIGURE_PHOTO_IMPORTING_WITH_PATH = gql`
  mutation ConfigurePhotoImportingWithPath(
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

export const CONFIGURE_IMAGE_ANALYSIS = gql`
  mutation ConfigureImageAnalysis(
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

export const AFTER_SIGNUP = gql`
  query AfterSignup {
    afterSignup {
      token
      refreshToken
    }
  }
`

// Response types
export interface EnvironmentResponse {
  environment: {
    demo: boolean
    firstRun: boolean
    form: string | null
    userId: string | null
    libraryId: string | null
    libraryPathId: string | null
  }
}

export interface CreateUserResponse {
  createUser: {
    hasSetPersonalInfo: boolean
    userId: string
  }
}

export interface CreateLibraryResponse {
  createLibrary: {
    hasCreatedLibrary: boolean
    userId: string
    libraryId: string
    libraryPathId: string
  }
}

export interface PhotoImportingResponse {
  PhotoImporting: {
    hasConfiguredImporting: boolean
    userId: string
    libraryId: string
  }
}

export interface ImageAnalysisResponse {
  imageAnalysis: {
    hasConfiguredImageAnalysis: boolean
    userId: string
  }
}

export interface AfterSignupResponse {
  afterSignup: {
    token: string
    refreshToken: string
  }
}
