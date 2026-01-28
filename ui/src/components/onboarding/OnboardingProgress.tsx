import { ONBOARDING_STEPS } from '../../lib/onboarding'

interface OnboardingProgressProps {
  currentStep: number
}

export function OnboardingProgress({ currentStep }: OnboardingProgressProps) {
  return (
    <nav aria-label="Onboarding progress" className="mb-8">
      <ol className="flex items-center justify-center gap-2">
        {ONBOARDING_STEPS.map((step, index) => {
          const isCompleted = step.number < currentStep
          const isCurrent = step.number === currentStep
          const isUpcoming = step.number > currentStep

          return (
            <li key={step.number} className="flex items-center">
              <div
                className={`
                  flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium
                  transition-colors duration-200
                  ${isCompleted ? 'bg-green-600 text-white' : ''}
                  ${isCurrent ? 'bg-blue-600 text-white ring-2 ring-blue-400 ring-offset-2 ring-offset-neutral-900' : ''}
                  ${isUpcoming ? 'bg-neutral-700 text-neutral-400' : ''}
                `}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isCompleted ? (
                  <svg
                    className="h-4 w-4"
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
                ) : (
                  step.number
                )}
              </div>
              {index < ONBOARDING_STEPS.length - 1 && (
                <div
                  className={`
                    mx-2 h-0.5 w-8
                    ${isCompleted ? 'bg-green-600' : 'bg-neutral-700'}
                  `}
                />
              )}
            </li>
          )
        })}
      </ol>
      <p className="mt-3 text-center text-sm text-neutral-400">
        Step {currentStep} of {ONBOARDING_STEPS.length}:{' '}
        <span className="text-neutral-200">
          {ONBOARDING_STEPS.find((s) => s.number === currentStep)?.label}
        </span>
      </p>
    </nav>
  )
}
