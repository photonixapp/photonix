import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@apollo/client/react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { OnboardingCard } from '../../components/onboarding'
import { Button, Input, Select } from '../../components/ui'
import {
  CREATE_LIBRARY_LOCAL,
  CREATE_LIBRARY_S3,
  type CreateLibraryResponse,
  useOnboardingStore,
  type StorageBackend,
  getErrorMessage,
} from '../../lib/onboarding'

export const Route = createFileRoute('/onboarding/step3')({
  component: Step3CreateLibrary,
})

const step3Schema = z.object({
  libraryName: z.string().min(3, 'Library name must be at least 3 characters'),
  storageBackend: z.enum(['Lo', 'S3']),
  basePath: z.string().min(1, 'Base path is required'),
  s3Server: z.string(),
  s3Bucket: z.string(),
  s3Path: z.string(),
  s3PublicBaseUrl: z.string(),
  s3AccessKey: z.string(),
  s3SecretKey: z.string(),
}).superRefine((data, ctx) => {
  if (data.storageBackend === 'S3') {
    if (!data.s3Server) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'S3 server URL is required', path: ['s3Server'] })
    }
    if (!data.s3Bucket) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'S3 bucket is required', path: ['s3Bucket'] })
    }
    if (!data.s3Path) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'S3 path is required', path: ['s3Path'] })
    }
    if (data.s3AccessKey.length < 20) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Access key must be at least 20 characters', path: ['s3AccessKey'] })
    }
    if (data.s3SecretKey.length < 40) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Secret key must be at least 40 characters', path: ['s3SecretKey'] })
    }
  }
})

const STORAGE_OPTIONS = [
  { value: 'Lo', label: 'Local Storage' },
  // { value: 'S3', label: 'S3-Compatible Storage' },  // S3 backend not implemented yet
]

function Step3CreateLibrary() {
  const navigate = useNavigate()
  const { userId, formData, updateFormData, setLibraryIds, setCurrentStep } =
    useOnboardingStore()

  const [createLibraryLocal, { loading: loadingLocal, error: errorLocal }] =
    useMutation<CreateLibraryResponse>(CREATE_LIBRARY_LOCAL)

  const [createLibraryS3, { loading: loadingS3, error: errorS3 }] =
    useMutation<CreateLibraryResponse>(CREATE_LIBRARY_S3)

  const loading = loadingLocal || loadingS3
  const mutationError = errorLocal || errorS3

  const form = useForm({
    defaultValues: {
      libraryName: formData.libraryName || '',
      storageBackend: (formData.storageBackend || 'Lo') as StorageBackend,
      basePath: formData.basePath || '/data/photos',
      s3Server: formData.s3Server || '',
      s3Bucket: formData.s3Bucket || '',
      s3Path: formData.s3Path || '',
      s3PublicBaseUrl: formData.s3PublicBaseUrl || '',
      s3AccessKey: formData.s3AccessKey || '',
      s3SecretKey: formData.s3SecretKey || '',
    },
    validators: {
      onSubmit: step3Schema,
    },
    onSubmit: async ({ value }) => {
      try {
        let result

        if (value.storageBackend === 'Lo') {
          result = await createLibraryLocal({
            variables: {
              name: value.libraryName,
              backendType: value.storageBackend,
              path: value.basePath,
              userId,
            },
          })
        } else {
          result = await createLibraryS3({
            variables: {
              name: value.libraryName,
              backendType: value.storageBackend,
              path: value.s3Path,
              url: `${value.s3Server}/${value.s3Bucket}`,
              s3AccessKeyId: value.s3AccessKey,
              s3SecretKey: value.s3SecretKey,
              userId,
            },
          })
        }

        if (result.data?.createLibrary.hasCreatedLibrary) {
          updateFormData(value)
          setLibraryIds(
            result.data.createLibrary.libraryId,
            result.data.createLibrary.libraryPathId
          )
          setCurrentStep(4)
          navigate({ to: '/onboarding/step4' })
        }
      } catch (err) {
        console.error('Failed to create library:', err)
      }
    },
  })

  return (
    <OnboardingCard
      title="Create Photo Library"
      description="Configure where your photos will be stored and organized."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
        className="space-y-4"
      >
        <form.Field name="libraryName">
          {(field) => (
            <Input
              label="Library Name"
              name={field.name}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              error={getErrorMessage(field.state.meta.errors)}
              placeholder="My Photos"
              data-testid="library-name-input"
            />
          )}
        </form.Field>

        <form.Field name="storageBackend">
          {(field) => (
            <Select
              label="Storage Type"
              name={field.name}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value as StorageBackend)}
              onBlur={field.handleBlur}
              error={getErrorMessage(field.state.meta.errors)}
              options={STORAGE_OPTIONS}
              data-testid="storage-type-select"
            />
          )}
        </form.Field>

        <form.Subscribe selector={(state) => state.values.storageBackend}>
          {(storageBackend) => (
            <>
              {storageBackend === 'Lo' && (
                <form.Field name="basePath">
                  {(field) => (
                    <Input
                      label="Base Path"
                      name={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      error={getErrorMessage(field.state.meta.errors)}
                      placeholder="/data/photos"
                      hint="The directory where photos will be stored"
                      data-testid="base-path-input"
                    />
                  )}
                </form.Field>
              )}

              {storageBackend === 'S3' && (
                <>
                  <form.Field name="s3Server">
                    {(field) => (
                      <Input
                        label="S3 Server URL"
                        name={field.name}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        error={getErrorMessage(field.state.meta.errors)}
                        placeholder="https://s3.amazonaws.com"
                        data-testid="s3-server-input"
                      />
                    )}
                  </form.Field>

                  <form.Field name="s3Bucket">
                    {(field) => (
                      <Input
                        label="S3 Bucket"
                        name={field.name}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        error={getErrorMessage(field.state.meta.errors)}
                        placeholder="my-photos-bucket"
                        data-testid="s3-bucket-input"
                      />
                    )}
                  </form.Field>

                  <form.Field name="s3Path">
                    {(field) => (
                      <Input
                        label="S3 Path"
                        name={field.name}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        error={getErrorMessage(field.state.meta.errors)}
                        placeholder="photos/"
                        data-testid="s3-path-input"
                      />
                    )}
                  </form.Field>

                  <form.Field name="s3AccessKey">
                    {(field) => (
                      <Input
                        label="Access Key ID"
                        name={field.name}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        error={getErrorMessage(field.state.meta.errors)}
                        placeholder="AKIAIOSFODNN7EXAMPLE"
                        data-testid="s3-access-key-input"
                      />
                    )}
                  </form.Field>

                  <form.Field name="s3SecretKey">
                    {(field) => (
                      <Input
                        label="Secret Access Key"
                        name={field.name}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        error={getErrorMessage(field.state.meta.errors)}
                        type="password"
                        placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                        data-testid="s3-secret-key-input"
                      />
                    )}
                  </form.Field>
                </>
              )}
            </>
          )}
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
            onClick={() => navigate({ to: '/onboarding/step2' })}
            data-testid="back-button"
          >
            Back
          </Button>
          <Button type="submit" isLoading={loading} data-testid="submit-button">
            Create Library
          </Button>
        </div>
      </form>
    </OnboardingCard>
  )
}
