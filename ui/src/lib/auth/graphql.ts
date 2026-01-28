import { gql } from '@apollo/client'
import type { TypedDocumentNode } from '@apollo/client'
import type {
  TokenAuthResponse,
  RefreshTokenResponse,
  RevokeTokenResponse,
  EnvironmentResponse,
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

export const ENVIRONMENT: TypedDocumentNode<
  EnvironmentResponse,
  Record<string, never>
> = gql`
  query Environment {
    environment {
      demo
      sampleData
    }
  }
`
