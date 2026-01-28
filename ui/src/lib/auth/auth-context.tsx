import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import Cookies from 'js-cookie'
import { useMutation } from '@apollo/client/react'
import { TOKEN_AUTH, REVOKE_TOKEN } from './graphql'
import { setAccessToken, clearTokens } from './auth-store'
import {
  scheduleTokenRefresh,
  cancelTokenRefresh,
  performTokenRefresh,
  setAuthFailureCallback,
} from './token-refresh'
import type { AuthContextValue, User, LoginResult } from './types'

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const [tokenAuthMutation] = useMutation(TOKEN_AUTH)
  const [revokeTokenMutation] = useMutation(REVOKE_TOKEN)

  useEffect(() => {
    setAuthFailureCallback(() => {
      setUser(null)
      setIsAuthenticated(false)
    })

    const handleTokenExpired = () => {
      setUser(null)
      setIsAuthenticated(false)
    }
    window.addEventListener('auth:token-expired', handleTokenExpired)

    return () => {
      window.removeEventListener('auth:token-expired', handleTokenExpired)
    }
  }, [])

  useEffect(() => {
    async function initAuth() {
      const existingRefreshToken = Cookies.get('refreshToken')

      if (!existingRefreshToken) {
        setIsLoading(false)
        return
      }

      const result = await performTokenRefresh()

      if (result && typeof result === 'object') {
        setUser(result)
        setIsAuthenticated(true)
      }

      setIsLoading(false)
    }

    initAuth()
    return () => cancelTokenRefresh()
  }, [])

  const login = useCallback(
    async (username: string, password: string): Promise<LoginResult> => {
      try {
        const result = await tokenAuthMutation({
          variables: { username, password },
        })

        if (result.error) throw result.error

        const data = result.data

        if (data?.tokenAuth) {
          const { token, refreshToken: newRefreshToken } = data.tokenAuth
          const payload = JSON.parse(atob(token.split('.')[1]))

          setAccessToken(token, payload.exp)

          Cookies.set('refreshToken', newRefreshToken, {
            expires: 365,
            sameSite: 'strict',
            secure: window.location.protocol === 'https:',
          })

          scheduleTokenRefresh()
          setUser({ username: payload.username })
          setIsAuthenticated(true)

          return { success: true }
        }

        return { success: false, error: 'Authentication failed' }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    },
    [tokenAuthMutation]
  )

  const logout = useCallback(async () => {
    const currentRefreshToken = Cookies.get('refreshToken')
    cancelTokenRefresh()

    if (currentRefreshToken) {
      revokeTokenMutation({
        variables: { refreshToken: currentRefreshToken },
      }).catch(() => {})
    }

    clearTokens()
    Cookies.remove('refreshToken')
    setUser(null)
    setIsAuthenticated(false)
  }, [revokeTokenMutation])

  const refreshUser = useCallback(async () => {
    const existingRefreshToken = Cookies.get('refreshToken')
    if (!existingRefreshToken) return

    const result = await performTokenRefresh()
    if (result && typeof result === 'object') {
      setUser(result)
      setIsAuthenticated(true)
    }
  }, [])

  const value = useMemo(
    () => ({ user, isLoading, isAuthenticated, login, logout, refreshUser }),
    [user, isLoading, isAuthenticated, login, logout, refreshUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
