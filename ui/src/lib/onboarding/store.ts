import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { OnboardingFormData, OnboardingIds } from './types'

interface OnboardingState extends OnboardingIds {
  formData: Partial<OnboardingFormData>
  currentStep: number
  setUserId: (id: string) => void
  setLibraryIds: (libraryId: string, libraryPathId: string) => void
  updateFormData: (data: Partial<OnboardingFormData>) => void
  setCurrentStep: (step: number) => void
  reset: () => void
}

const initialState: Pick<OnboardingState, 'userId' | 'libraryId' | 'libraryPathId' | 'formData' | 'currentStep'> = {
  userId: null,
  libraryId: null,
  libraryPathId: null,
  currentStep: 1,
  formData: {
    // Default values
    storageBackend: 'Lo',
    watchForChanges: true,
    importFromAnotherPath: false,
    deleteAfterImport: false,
    classificationColorEnabled: true,
    classificationStyleEnabled: true,
    classificationObjectEnabled: true,
    classificationLocationEnabled: true,
    classificationFaceEnabled: true,
  },
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initialState,

      setUserId: (id) => set({ userId: id }),

      setLibraryIds: (libraryId, libraryPathId) =>
        set({ libraryId, libraryPathId }),

      updateFormData: (data) =>
        set((state) => ({
          formData: { ...state.formData, ...data },
        })),

      setCurrentStep: (step) => set({ currentStep: step }),

      reset: () => set(initialState),
    }),
    {
      name: 'photonix-onboarding',
    }
  )
)
