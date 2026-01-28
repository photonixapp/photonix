import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { OnboardingCard } from '../../components/onboarding'
import { Button } from '../../components/ui'
import { useOnboardingStore } from '../../lib/onboarding'

export const Route = createFileRoute('/onboarding/step2')({
  component: Step2AdminCreated,
})

function Step2AdminCreated() {
  const navigate = useNavigate()
  const { formData, setCurrentStep } = useOnboardingStore()

  const handleContinue = () => {
    setCurrentStep(3)
    navigate({ to: '/onboarding/step3' })
  }

  return (
    <OnboardingCard
      title="Admin Account Created"
      description="Your administrator account has been set up successfully."
    >
      <div className="space-y-4">
        <div className="rounded-md bg-green-900/30 border border-green-700 p-4">
          <div className="flex items-start gap-3">
            <svg
              className="h-6 w-6 flex-shrink-0 text-green-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="font-medium text-green-300">Account ready</p>
              <p className="mt-1 text-sm text-green-400/80">
                Username: <span className="font-mono">{formData.username || 'admin'}</span>
              </p>
            </div>
          </div>
        </div>

        <p className="text-neutral-400">
          Next, we'll set up your photo library. This is where Photonix will store and
          organize your photos.
        </p>

        <div className="flex justify-between pt-4">
          <Button
            variant="secondary"
            onClick={() => navigate({ to: '/onboarding/step1' })}
            data-testid="back-button"
          >
            Back
          </Button>
          <Button onClick={handleContinue} data-testid="continue-button">
            Continue
          </Button>
        </div>
      </div>
    </OnboardingCard>
  )
}
