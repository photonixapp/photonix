import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/onboarding/')({
  beforeLoad: () => {
    // Redirect to step 1 if landing on /onboarding
    throw redirect({ to: '/onboarding/step1' })
  },
})
