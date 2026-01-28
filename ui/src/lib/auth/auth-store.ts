let accessToken: string | null = null
let tokenExpiry: number | null = null

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string, expiryTimestamp: number): void {
  accessToken = token
  tokenExpiry = expiryTimestamp
}

export function getTokenExpiry(): number | null {
  return tokenExpiry
}

export function clearTokens(): void {
  accessToken = null
  tokenExpiry = null
}
