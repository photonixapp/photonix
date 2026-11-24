import { gql } from '@apollo/client'
import type { TypedDocumentNode } from '@apollo/client'
import type {
  TokenAuthResponse,
  RefreshTokenResponse,
  RevokeTokenResponse,
  DeleteAuthCookiesResponse,
  EnvironmentResponse,
  ProfileResponse,
} from './types'

export const TOKEN_AUTH: TypedDocumentNode<
  TokenAuthResponse,
  { username: string; password: string }
> = gql`
  mutation TokenAuth($username: String!, $password: String!) {
    tokenAuth(username: $username, password: $password) {
      token
      refreshToken
    }
  }
`

export const REFRESH_TOKEN: TypedDocumentNode<
  RefreshTokenResponse,
  { refreshToken: string }
> = gql`
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      token
      refreshToken
      payload
    }
  }
`

export const REVOKE_TOKEN: TypedDocumentNode<
  RevokeTokenResponse,
  { refreshToken: string }
> = gql`
  mutation RevokeToken($refreshToken: String!) {
    revokeToken(refreshToken: $refreshToken) {
      revoked
    }
  }
`

// Asks the server to clear the httpOnly JWT (access) and refresh-token cookies
// that JavaScript cannot remove on its own.
export const DELETE_AUTH_COOKIES: TypedDocumentNode<
  DeleteAuthCookiesResponse,
  Record<string, never>
> = gql`
  mutation DeleteAuthCookies {
    deleteTokenCookie {
      deleted
    }
    deleteRefreshTokenCookie {
      deleted
    }
  }
`

export const ENVIRONMENT: TypedDocumentNode<
  EnvironmentResponse,
  Record<string, never>
> = gql`
  query Environment {
    environment {
      demo
      sampleData
      analysisDisabled
    }
  }
`

// The logged-in user's profile, used for the header account menu and the
// settings area (isStaff gates the Users page, avatarUrl feeds the avatar).
export const GET_PROFILE: TypedDocumentNode<
  ProfileResponse,
  Record<string, never>
> = gql`
  query Profile {
    profile {
      id
      username
      email
      firstName
      lastName
      isStaff
      avatarUrl
    }
  }
`
