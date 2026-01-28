import { createFileRoute, useNavigate, redirect } from '@tanstack/react-router'
import { useState, useEffect, type FormEvent } from 'react'
import { useQuery } from '@apollo/client/react'
import { useAuth } from '../lib/auth/auth-context'
import {
  ENVIRONMENT,
  type EnvironmentResponse,
  useOnboardingStore,
} from '../lib/onboarding'

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>) => ({
    next: (search.next as string) || '/',
  }),
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})

// Map form values to onboarding routes
const ONBOARDING_ROUTES: Record<string, string> = {
  has_set_personal_info: '/onboarding/step1',
  has_created_library: '/onboarding/step3',
  has_configured_importing: '/onboarding/step4',
  has_configured_image_analysis: '/onboarding/step5',
}

function LoginPage() {
  const navigate = useNavigate()
  const { next } = Route.useSearch()
  const { login } = useAuth()
  const { setUserId, setLibraryIds } = useOnboardingStore()

  const { data: envData, loading: envLoading } =
    useQuery<EnvironmentResponse>(ENVIRONMENT)

  const isDemoMode = envData?.environment?.demo

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [credentialsSet, setCredentialsSet] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Redirect to onboarding if setup is incomplete
  useEffect(() => {
    if (!envLoading && envData?.environment?.form) {
      const { form, userId, libraryId, libraryPathId } = envData.environment

      // Populate store with IDs for resuming onboarding
      if (userId) setUserId(userId)
      if (libraryId && libraryPathId) setLibraryIds(libraryId, libraryPathId)

      // Redirect to appropriate onboarding step
      const route = ONBOARDING_ROUTES[form]
      if (route) {
        navigate({ to: route })
      }
    }
  }, [envLoading, envData, navigate, setUserId, setLibraryIds])

  // Pre-fill credentials when in demo mode
  useEffect(() => {
    if (!credentialsSet && !envLoading && isDemoMode) {
      setUsername('demo')
      setPassword('demo')
      setCredentialsSet(true)
    }
  }, [envLoading, isDemoMode, credentialsSet])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const result = await login(username, password)

    if (result.success) {
      navigate({ to: next })
    } else {
      setError(result.error || 'Login failed')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-neutral-800 rounded-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">
          Photonix Login
        </h1>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded mb-4" data-testid="login-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-neutral-300 mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-neutral-700 text-white px-4 py-3 rounded border border-neutral-600 focus:border-blue-500 focus:outline-none"
              data-testid="username-input"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-neutral-300 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-neutral-700 text-white px-4 py-3 rounded border border-neutral-600 focus:border-blue-500 focus:outline-none"
              data-testid="password-input"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium py-3 rounded transition-colors cursor-pointer disabled:cursor-not-allowed"
            data-testid="login-button"
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}
