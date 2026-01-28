export type StorageBackend = 'Lo' | 'S3'

export interface OnboardingFormData {
  // Step 1 - User
  username: string
  password: string
  passwordConfirm: string

  // Step 3 - Library
  libraryName: string
  storageBackend: StorageBackend
  basePath: string

  // Step 3 - S3 config (conditional)
  s3Server: string
  s3Bucket: string
  s3Path: string
  s3PublicBaseUrl: string
  s3AccessKey: string
  s3SecretKey: string

  // Step 4 - Importing
  watchForChanges: boolean
  importFromAnotherPath: boolean
  importPath: string
  deleteAfterImport: boolean

  // Step 5 - Classifiers
  classificationColorEnabled: boolean
  classificationStyleEnabled: boolean
  classificationObjectEnabled: boolean
  classificationLocationEnabled: boolean
  classificationFaceEnabled: boolean
}

export interface OnboardingIds {
  userId: string | null
  libraryId: string | null
  libraryPathId: string | null
}

export const ONBOARDING_STEPS = [
  { number: 1, label: 'Create Admin', path: '/onboarding/step1' },
  { number: 2, label: 'Admin Created', path: '/onboarding/step2' },
  { number: 3, label: 'Create Library', path: '/onboarding/step3' },
  { number: 4, label: 'Photo Importing', path: '/onboarding/step4' },
  { number: 5, label: 'Image Analysis', path: '/onboarding/step5' },
] as const

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]['number']
