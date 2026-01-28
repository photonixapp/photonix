import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@apollo/client/react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { OnboardingCard } from '../../components/onboarding'
import { Button, PasswordInput, Input } from '../../components/ui'
import {
  CREATE_USER,
  type CreateUserResponse,
  useOnboardingStore,
  getErrorMessage,
} from '../../lib/onboarding'

export const Route = createFileRoute('/onboarding/step1')({
  component: Step1AdminUser,
})

const step1Schema = z
  .object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    passwordConfirm: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Passwords do not match',
    path: ['passwordConfirm'],
  })

function Step1AdminUser() {
  const navigate = useNavigate()
  const { formData, updateFormData, setUserId, setCurrentStep } = useOnboardingStore()

  const [createUser, { loading, error: mutationError }] = useMutation<CreateUserResponse>(CREATE_USER)

  const form = useForm({
    defaultValues: {
      username: formData.username || '',
      password: formData.password || '',
      passwordConfirm: formData.passwordConfirm || '',
    },
    validators: {
      onSubmit: step1Schema,
    },
    onSubmit: async ({ value }) => {
      try {
        const result = await createUser({
          variables: {
            username: value.username,
            password: value.password,
            password1: value.passwordConfirm,
          },
        })

        if (result.data?.createUser.hasSetPersonalInfo) {
          updateFormData(value)
          setUserId(result.data.createUser.userId)
          setCurrentStep(2)
          navigate({ to: '/onboarding/step2' })
        }
      } catch (err) {
        console.error('Failed to create user:', err)
      }
    },
  })

  return (
    <OnboardingCard
      title="Create Admin Account"
      description="Set up your administrator credentials to get started."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
        className="space-y-4"
      >
        <form.Field name="username">
          {(field) => (
            <Input
              label="Username"
              name={field.name}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              error={getErrorMessage(field.state.meta.errors)}
              placeholder="admin"
              autoComplete="username"
              data-testid="username-input"
            />
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <PasswordInput
              label="Password"
              name={field.name}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              error={getErrorMessage(field.state.meta.errors)}
              placeholder="Enter a secure password"
              autoComplete="new-password"
              data-testid="password-input"
            />
          )}
        </form.Field>

        <form.Field name="passwordConfirm">
          {(field) => (
            <PasswordInput
              label="Confirm Password"
              name={field.name}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              error={getErrorMessage(field.state.meta.errors)}
              placeholder="Confirm your password"
              autoComplete="new-password"
              data-testid="password-confirm-input"
            />
          )}
        </form.Field>

        {mutationError && (
          <div className="rounded-md bg-red-900/50 p-3 text-sm text-red-300">
            {mutationError.message}
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button type="submit" isLoading={loading} data-testid="submit-button">
            Create Account
          </Button>
        </div>
      </form>
    </OnboardingCard>
  )
}
