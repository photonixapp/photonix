export interface User {
  username: string
}

export interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<LoginResult>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

export interface LoginResult {
  success: boolean
  error?: string
}

export interface TokenPayload {
  username: string
  exp: number
}

export interface TokenAuthResponse {
  tokenAuth: {
    token: string
    refreshToken: string
  }
}

export interface RefreshTokenResponse {
  refreshToken: {
    token: string
    refreshToken: string
    payload: TokenPayload
  }
}

export interface RevokeTokenResponse {
  revokeToken: {
    revoked: boolean
  }
}

export interface DeleteAuthCookiesResponse {
  deleteTokenCookie: {
    deleted: boolean
  }
  deleteRefreshTokenCookie: {
    deleted: boolean
  }
}

export interface Environment {
  demo: boolean
  sampleData: boolean
  analysisDisabled: boolean
}

export interface EnvironmentResponse {
  environment: Environment
}

export interface ProfileResponse {
  profile: {
    id: string
    username: string
    email: string | null
    firstName: string | null
    lastName: string | null
    isStaff: boolean
    avatarUrl: string | null
  } | null
}
