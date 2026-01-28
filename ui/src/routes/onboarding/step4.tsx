import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@apollo/client/react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { OnboardingCard } from '../../components/onboarding'
import { Button, Input, Switch } from '../../components/ui'
import {
  CONFIGURE_PHOTO_IMPORTING,
  CONFIGURE_PHOTO_IMPORTING_WITH_PATH,
  type PhotoImportingResponse,
  useOnboardingStore,
  getErrorMessage,
} from '../../lib/onboarding'

export const Route = createFileRoute('/onboarding/step4')({
  component: Step4PhotoImporting,
})

const step4Schema = z
  .object({
    watchForChanges: z.boolean(),
    importFromAnotherPath: z.boolean(),
    importPath: z.string(),
    deleteAfterImport: z.boolean(),
  })
  .refine(
    (data) => !data.importFromAnotherPath || data.importPath.length > 0,
    {
      message: 'Import path is required when importing from another location',
      path: ['importPath'],
    }
  )

function Step4PhotoImporting() {
  const navigate = useNavigate()
  const { userId, libraryId, libraryPathId, formData, updateFormData, setCurrentStep } =
    useOnboardingStore()

  const [configureImporting, { loading: loadingBasic, error: errorBasic }] =
    useMutation<PhotoImportingResponse>(CONFIGURE_PHOTO_IMPORTING)

  const [configureImportingWithPath, { loading: loadingWithPath, error: errorWithPath }] =
    useMutation<PhotoImportingResponse>(CONFIGURE_PHOTO_IMPORTING_WITH_PATH)

  const loading = loadingBasic || loadingWithPath
  const mutationError = errorBasic || errorWithPath

  const form = useForm({
    defaultValues: {
      watchForChanges: formData.watchForChanges ?? true,
      importFromAnotherPath: formData.importFromAnotherPath ?? false,
      importPath: formData.importPath || '',
      deleteAfterImport: formData.deleteAfterImport ?? false,
    },
    validators: {
      onSubmit: step4Schema,
    },
    onSubmit: async ({ value }) => {
      try {
        let result

        if (!value.importFromAnotherPath) {
          result = await configureImporting({
            variables: {
              watchForChanges: value.watchForChanges,
              addAnotherPath: false,
              userId,
              libraryId,
              libraryPathId,
            },
          })
        } else {
          result = await configureImportingWithPath({
            variables: {
              watchForChanges: value.watchForChanges,
              addAnotherPath: true,
              importPath: value.importPath,
              deleteAfterImport: value.deleteAfterImport,
              userId,
              libraryId,
              libraryPathId,
            },
          })
        }

        if (result.data?.PhotoImporting.hasConfiguredImporting) {
          updateFormData(value)
          setCurrentStep(5)
          navigate({ to: '/onboarding/step5' })
        }
      } catch (err) {
        console.error('Failed to configure importing:', err)
      }
    },
  })

  return (
    <OnboardingCard
      title="Photo Importing"
      description="Configure how Photonix should handle new photos."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
        className="space-y-5"
      >
        <form.Field name="watchForChanges">
          {(field) => (
            <Switch
              label="Watch for new photos"
              description="Automatically detect and import new photos added to the library"
              name={field.name}
              checked={field.state.value}
              onChange={(e) => field.handleChange(e.target.checked)}
              data-testid="watch-for-changes-switch"
            />
          )}
        </form.Field>

        <div className="border-t border-neutral-700 pt-5">
          <form.Field name="importFromAnotherPath">
            {(field) => (
              <Switch
                label="Import from another location"
                description="Copy photos from a separate directory into your library"
                name={field.name}
                checked={field.state.value}
                onChange={(e) => field.handleChange(e.target.checked)}
                data-testid="import-from-another-path-switch"
              />
            )}
          </form.Field>
        </div>

        <form.Subscribe selector={(state) => state.values.importFromAnotherPath}>
          {(importFromAnotherPath) =>
            importFromAnotherPath && (
              <div className="space-y-4 rounded-md bg-neutral-700/30 p-4">
                <form.Field name="importPath">
                  {(field) => (
                    <Input
                      label="Import Path"
                      name={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      error={getErrorMessage(field.state.meta.errors)}
                      placeholder="/path/to/import/photos"
                      hint="Photos from this directory will be copied to your library"
                      data-testid="import-path-input"
                    />
                  )}
                </form.Field>

                <form.Field name="deleteAfterImport">
                  {(field) => (
                    <Switch
                      label="Delete after import"
                      description="Remove original files after copying to library (use with caution)"
                      name={field.name}
                      checked={field.state.value}
                      onChange={(e) => field.handleChange(e.target.checked)}
                      data-testid="delete-after-import-switch"
                    />
                  )}
                </form.Field>
              </div>
            )
          }
        </form.Subscribe>

        {mutationError && (
          <div className="rounded-md bg-red-900/50 p-3 text-sm text-red-300">
            {mutationError.message}
          </div>
        )}

        <div className="flex justify-between pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate({ to: '/onboarding/step3' })}
            data-testid="back-button"
          >
            Back
          </Button>
          <Button type="submit" isLoading={loading} data-testid="submit-button">
            Continue
          </Button>
        </div>
      </form>
    </OnboardingCard>
  )
}
