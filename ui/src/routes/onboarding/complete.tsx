import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@apollo/client/react'
import { useEffect, useState } from 'react'
import { OnboardingCard } from '../../components/onboarding'
import { Button } from '../../components/ui'
import {
  AFTER_SIGNUP,
  type AfterSignupResponse,
  useOnboardingStore,
} from '../../lib/onboarding'
import { useAuth } from '../../lib/auth/auth-context'
import { setAccessToken } from '../../lib/auth/auth-store'
import Cookies from 'js-cookie'

export const Route = createFileRoute('/onboarding/complete')({
  component: OnboardingComplete,
})

function OnboardingComplete() {
  const [redirecting, setRedirecting] = useState(false)
  const { reset } = useOnboardingStore()
  const { refreshUser } = useAuth()

  const { data, loading, error } = useQuery<AfterSignupResponse>(AFTER_SIGNUP)

  useEffect(() => {
    if (data?.afterSignup) {
      // Store tokens - decode JWT to get expiry
      const payload = JSON.parse(atob(data.afterSignup.token.split('.')[1]))
      setAccessToken(data.afterSignup.token, payload.exp)
      Cookies.set('refreshToken', data.afterSignup.refreshToken, {
        sameSite: 'strict',
        secure: window.location.protocol === 'https:',
        expires: 365,
      })

      // Clear onboarding state
      reset()

      // Refresh user context and redirect
      setRedirecting(true)
      refreshUser()

      // Full page reload to ensure clean state
      setTimeout(() => {
        window.location.href = '/'
      }, 2000)
    }
  }, [data, reset, refreshUser])

  if (loading) {
    return (
      <OnboardingCard title="Completing Setup...">
        <div className="flex flex-col items-center py-8">
          <svg
            className="h-12 w-12 animate-spin text-blue-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="mt-4 text-neutral-400">Setting up your account...</p>
        </div>
      </OnboardingCard>
    )
  }

  if (error) {
    return (
      <OnboardingCard title="Setup Error">
        <div className="rounded-md bg-red-900/50 p-4 text-red-300">
          <p className="font-medium">Failed to complete setup</p>
          <p className="mt-1 text-sm">{error.message}</p>
        </div>
        <div className="mt-6">
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </OnboardingCard>
    )
  }

  return (
    <OnboardingCard title="Setup Complete!">
      <div className="flex flex-col items-center py-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-600">
          <svg
            className="h-10 w-10 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h2 className="mt-4 text-xl font-semibold text-white">
          Welcome to Photonix!
        </h2>

        <p className="mt-2 text-center text-neutral-400">
          Your photo library is ready. You'll be redirected to the main
          application in a moment.
        </p>

        {redirecting && (
          <div className="mt-6 flex items-center gap-2 text-blue-400">
            <svg
              className="h-5 w-5 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Redirecting...</span>
          </div>
        )}
      </div>
    </OnboardingCard>
  )
}
