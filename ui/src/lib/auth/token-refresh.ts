import Cookies from 'js-cookie'
import { apolloClient } from '../apollo-client'
import { REFRESH_TOKEN } from './graphql'
import { setAccessToken, clearTokens } from './auth-store'
import type { User } from './types'

const TOKEN_EXPIRY_PREEMPT = 2 * 60 * 1000  // Refresh 2 min before expiry
const DEFAULT_REFRESH_INTERVAL = 3 * 1000   // Initial refresh after login
const ERROR_REFRESH_INTERVAL = 15 * 1000    // Retry interval on error

let refreshTimeout: ReturnType<typeof setTimeout> | null = null
let onAuthFailure: (() => void) | null = null

export function setAuthFailureCallback(callback: () => void): void {
  onAuthFailure = callback
}

export function scheduleTokenRefresh(delayMs?: number): void {
  if (refreshTimeout) clearTimeout(refreshTimeout)
  const delay = delayMs ?? DEFAULT_REFRESH_INTERVAL
  refreshTimeout = setTimeout(performTokenRefresh, delay)
}

export function cancelTokenRefresh(): void {
  if (refreshTimeout) {
    clearTimeout(refreshTimeout)
    refreshTimeout = null
  }
}

export async function performTokenRefresh(): Promise<User | false> {
  const refreshTokenValue = Cookies.get('refreshToken')

  if (!refreshTokenValue) {
    onAuthFailure?.()
    return false
  }

  try {
    const result = await apolloClient.mutate({
      mutation: REFRESH_TOKEN,
      variables: { refreshToken: refreshTokenValue },
    })

    if (result.error) throw result.error

    if (result.data?.refreshToken) {
      const { token, refreshToken: newRefreshToken, payload } = result.data.refreshToken

      setAccessToken(token, payload.exp)

      Cookies.set('refreshToken', newRefreshToken, {
        expires: 365,
        sameSite: 'strict',
        secure: window.location.protocol === 'https:',
      })

      const nextRefreshDelay = payload.exp * 1000 - Date.now() - TOKEN_EXPIRY_PREEMPT
      scheduleTokenRefresh(Math.max(nextRefreshDelay, DEFAULT_REFRESH_INTERVAL))

      return { username: payload.username }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : ''

    if (
      message.includes('Refresh token is expired') ||
      message.includes('Invalid refresh token')
    ) {
      clearTokens()
      Cookies.remove('refreshToken')
      onAuthFailure?.()
      return false
    }

    scheduleTokenRefresh(ERROR_REFRESH_INTERVAL)
  }

  return false
}
