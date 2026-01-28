import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@apollo/client/react'
import { useForm } from '@tanstack/react-form'
import { OnboardingCard } from '../../components/onboarding'
import { Button, Switch } from '../../components/ui'
import {
  CONFIGURE_IMAGE_ANALYSIS,
  type ImageAnalysisResponse,
  useOnboardingStore,
} from '../../lib/onboarding'

export const Route = createFileRoute('/onboarding/step5')({
  component: Step5ImageAnalysis,
})

const CLASSIFIERS = [
  {
    key: 'classificationColorEnabled' as const,
    label: 'Color Analysis',
    description: 'Identify dominant colors in your photos for color-based searching',
  },
  {
    key: 'classificationStyleEnabled' as const,
    label: 'Style Detection',
    description: 'Detect photo styles like portrait, landscape, macro, etc.',
  },
  {
    key: 'classificationObjectEnabled' as const,
    label: 'Object Recognition',
    description: 'Identify objects, animals, and scenes in your photos',
  },
  {
    key: 'classificationLocationEnabled' as const,
    label: 'Location Awareness',
    description: 'Extract and organize photos by GPS location data',
  },
  {
    key: 'classificationFaceEnabled' as const,
    label: 'Face Detection',
    description: 'Detect and group photos by faces for people-based browsing',
  },
]

function Step5ImageAnalysis() {
  const navigate = useNavigate()
  const { userId, libraryId, formData, updateFormData, setCurrentStep } =
    useOnboardingStore()

  const [configureAnalysis, { loading, error: mutationError }] =
    useMutation<ImageAnalysisResponse>(CONFIGURE_IMAGE_ANALYSIS)

  const form = useForm({
    defaultValues: {
      classificationColorEnabled: formData.classificationColorEnabled ?? true,
      classificationStyleEnabled: formData.classificationStyleEnabled ?? true,
      classificationObjectEnabled: formData.classificationObjectEnabled ?? true,
      classificationLocationEnabled: formData.classificationLocationEnabled ?? true,
      classificationFaceEnabled: formData.classificationFaceEnabled ?? true,
    },
    onSubmit: async ({ value }) => {
      try {
        const result = await configureAnalysis({
          variables: {
            ...value,
            userId,
            libraryId,
          },
        })

        if (result.data?.imageAnalysis.hasConfiguredImageAnalysis) {
          updateFormData(value)
          setCurrentStep(6)
          navigate({ to: '/onboarding/complete' })
        }
      } catch (err) {
        console.error('Failed to configure image analysis:', err)
      }
    },
  })

  return (
    <OnboardingCard
      title="Image Analysis"
      description="Choose which AI-powered features to enable. These help organize and search your photos."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
        className="space-y-4"
      >
        <div className="space-y-3">
          {CLASSIFIERS.map((classifier) => (
            <form.Field key={classifier.key} name={classifier.key}>
              {(field) => (
                <div className="rounded-md bg-neutral-700/30 p-3">
                  <Switch
                    label={classifier.label}
                    description={classifier.description}
                    name={field.name}
                    checked={field.state.value}
                    onChange={(e) => field.handleChange(e.target.checked)}
                    data-testid={`${classifier.key}-switch`}
                  />
                </div>
              )}
            </form.Field>
          ))}
        </div>

        <p className="text-sm text-neutral-500">
          You can change these settings later in the application preferences.
          Enabling all features provides the best photo discovery experience.
        </p>

        {mutationError && (
          <div className="rounded-md bg-red-900/50 p-3 text-sm text-red-300">
            {mutationError.message}
          </div>
        )}

        <div className="flex justify-between pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate({ to: '/onboarding/step4' })}
            data-testid="back-button"
          >
            Back
          </Button>
          <Button type="submit" isLoading={loading} data-testid="submit-button">
            Complete Setup
          </Button>
        </div>
      </form>
    </OnboardingCard>
  )
}
