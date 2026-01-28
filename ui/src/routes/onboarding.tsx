import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router'
import { OnboardingProgress } from '../components/onboarding'
import { ONBOARDING_STEPS } from '../lib/onboarding'

export const Route = createFileRoute('/onboarding')({
  component: OnboardingLayout,
})

function OnboardingLayout() {
  const location = useLocation()

  // Determine current step from pathname
  const currentStep = (() => {
    const match = location.pathname.match(/\/onboarding\/step(\d+)/)
    if (match) return parseInt(match[1], 10)
    if (location.pathname === '/onboarding/complete') return ONBOARDING_STEPS.length + 1
    return 1
  })()

  const showProgress = currentStep <= ONBOARDING_STEPS.length

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white">Photonix</h1>
        <p className="mt-1 text-neutral-400">Photo Management Setup</p>
      </div>

      {showProgress && <OnboardingProgress currentStep={currentStep} />}

      <Outlet />
    </div>
  )
}
