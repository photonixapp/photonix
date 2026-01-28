import { test, expect } from '@playwright/test'
import { runDjangoCommand } from './test-utils'

// Clean up any leftover test users from previous runs
function cleanupOnboardingTestUser() {
  runDjangoCommand(`
from photonix.accounts.models import User
from photonix.photos.models import Library, LibraryPath, LibraryUser

# Clean up any test user and their data
for username in ['onboardingadmin', 'admin']:
    try:
        user = User.objects.get(username=username)
        library_ids = list(LibraryUser.objects.filter(user=user).values_list('library_id', flat=True))
        LibraryUser.objects.filter(user=user).delete()
        LibraryPath.objects.filter(library_id__in=library_ids).delete()
        Library.objects.filter(id__in=library_ids).delete()
        user.delete()
    except User.DoesNotExist:
        pass
`)
}

test.describe.serial('Onboarding Flow', () => {
  test.beforeAll(async () => {
    // Clean up any leftover test data
    cleanupOnboardingTestUser()
  })

  test.afterAll(async () => {
    // Clean up test data
    cleanupOnboardingTestUser()
  })

  test.beforeEach(async ({ context }) => {
    // Clear all storage before each test
    await context.clearCookies()
  })

  test('completes full onboarding flow with local storage', async ({ page }) => {
    // Navigate to onboarding step 1
    await page.goto('/onboarding/step1')

    // Step 1: Create Admin Account
    await expect(page.getByText('Create Admin Account')).toBeVisible()
    await expect(page.getByText('Step 1 of 5')).toBeVisible()

    await page.getByTestId('username-input').fill('onboardingadmin')
    await page.getByTestId('password-input').fill('testpassword123')
    await page.getByTestId('password-confirm-input').fill('testpassword123')
    await page.getByTestId('submit-button').click()

    // Step 2: Admin Created Confirmation (wait for API call)
    await expect(page).toHaveURL('/onboarding/step2', { timeout: 10000 })
    await expect(page.getByText('Admin Account Created')).toBeVisible()
    await expect(page.getByText('Step 2 of 5')).toBeVisible()
    await expect(page.getByText('onboardingadmin')).toBeVisible()

    await page.getByTestId('continue-button').click()

    // Step 3: Create Library
    await expect(page).toHaveURL('/onboarding/step3')
    await expect(page.getByText('Create Photo Library')).toBeVisible()
    await expect(page.getByText('Step 3 of 5')).toBeVisible()

    await page.getByTestId('library-name-input').fill('My Photos')
    // Local storage is default, base path is pre-filled
    await expect(page.getByTestId('base-path-input')).toHaveValue('/data/photos')
    await page.getByTestId('submit-button').click()

    // Step 4: Photo Importing
    await expect(page).toHaveURL('/onboarding/step4')
    await expect(page.getByRole('heading', { name: 'Photo Importing' })).toBeVisible()
    await expect(page.getByText('Step 4 of 5')).toBeVisible()

    // Watch for changes is enabled by default
    await expect(page.getByTestId('watch-for-changes-switch')).toBeChecked()

    // Keep defaults and continue
    await page.getByTestId('submit-button').click()

    // Step 5: Image Analysis
    await expect(page).toHaveURL('/onboarding/step5')
    await expect(page.getByRole('heading', { name: 'Image Analysis' })).toBeVisible()
    await expect(page.getByText('Step 5 of 5')).toBeVisible()

    // All classifiers are enabled by default
    await expect(page.getByTestId('classificationColorEnabled-switch')).toBeChecked()
    await expect(page.getByTestId('classificationStyleEnabled-switch')).toBeChecked()
    await expect(page.getByTestId('classificationObjectEnabled-switch')).toBeChecked()
    await expect(page.getByTestId('classificationLocationEnabled-switch')).toBeChecked()
    await expect(page.getByTestId('classificationFaceEnabled-switch')).toBeChecked()

    // Complete setup
    await page.getByTestId('submit-button').click()

    // Completion page
    await expect(page).toHaveURL('/onboarding/complete')
    await expect(page.getByText('Setup Complete!')).toBeVisible()

    // Wait for the "Redirecting..." indicator to appear
    await expect(page.getByText('Redirecting...')).toBeVisible({ timeout: 5000 })
  })

  test('validates required fields on step 1', async ({ page }) => {
    await page.goto('/onboarding/step1')

    // Try to submit empty form
    await page.getByTestId('submit-button').click()

    // Should show validation errors
    await expect(page.getByText('Username is required')).toBeVisible()
  })

  test('validates password minimum length', async ({ page }) => {
    await page.goto('/onboarding/step1')

    await page.getByTestId('username-input').fill('admin')
    await page.getByTestId('password-input').fill('short')
    await page.getByTestId('password-confirm-input').fill('short')
    await page.getByTestId('submit-button').click()

    await expect(page.getByText('Password must be at least 8 characters')).toBeVisible()
  })

  test('validates password confirmation matches', async ({ page }) => {
    await page.goto('/onboarding/step1')

    await page.getByTestId('username-input').fill('admin')
    await page.getByTestId('password-input').fill('testpassword123')
    await page.getByTestId('password-confirm-input').fill('differentpassword')
    await page.getByTestId('submit-button').click()

    await expect(page.getByText('Passwords do not match')).toBeVisible()
  })

  test('validates library name minimum length', async ({ page }) => {
    // Skip to step 3 by navigating directly (in real app, store would have data)
    await page.goto('/onboarding/step3')

    await page.getByTestId('library-name-input').fill('ab')
    await page.getByTestId('submit-button').click()

    await expect(page.getByText('Library name must be at least 3 characters')).toBeVisible()
  })

  test('can navigate back through steps', async ({ page }) => {
    await page.goto('/onboarding/step3')

    // Go back to step 2
    await page.getByTestId('back-button').click()
    await expect(page).toHaveURL('/onboarding/step2')

    // Go back to step 1
    await page.getByTestId('back-button').click()
    await expect(page).toHaveURL('/onboarding/step1')
  })

  test('shows import path fields when import from another path is enabled', async ({ page }) => {
    await page.goto('/onboarding/step4')

    // Import path fields should not be visible initially
    await expect(page.getByTestId('import-path-input')).not.toBeVisible()
    await expect(page.getByTestId('delete-after-import-switch')).not.toBeVisible()

    // Enable import from another path (click label to avoid hidden input interception)
    await page.getByTestId('import-from-another-path-switch-label').click()

    // Import path fields should now be visible
    await expect(page.getByTestId('import-path-input')).toBeVisible()
    await expect(page.getByTestId('delete-after-import-switch')).toBeVisible()
  })

  test('progress indicator shows correct step', async ({ page }) => {
    await page.goto('/onboarding/step1')
    await expect(page.getByText('Step 1 of 5: Create Admin')).toBeVisible()

    await page.goto('/onboarding/step2')
    await expect(page.getByText('Step 2 of 5: Admin Created')).toBeVisible()

    await page.goto('/onboarding/step3')
    await expect(page.getByText('Step 3 of 5: Create Library')).toBeVisible()

    await page.goto('/onboarding/step4')
    await expect(page.getByText('Step 4 of 5: Photo Importing')).toBeVisible()

    await page.goto('/onboarding/step5')
    await expect(page.getByText('Step 5 of 5: Image Analysis')).toBeVisible()
  })

  test('can toggle classifier switches on step 5', async ({ page }) => {
    await page.goto('/onboarding/step5')

    // All should be checked by default
    const colorSwitch = page.getByTestId('classificationColorEnabled-switch')
    const colorSwitchLabel = page.getByTestId('classificationColorEnabled-switch-label')
    await expect(colorSwitch).toBeChecked()

    // Toggle off (click label to avoid hidden input interception)
    await colorSwitchLabel.click()
    await expect(colorSwitch).not.toBeChecked()

    // Toggle back on
    await colorSwitchLabel.click()
    await expect(colorSwitch).toBeChecked()
  })
})
