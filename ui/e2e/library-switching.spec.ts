import { test, expect } from '@playwright/test'
import {
  runDjangoCommand,
  setupTestUser,
  cleanupTestUser,
  login,
} from './test-utils'

const LIBRARY_TEST_USER = {
  username: 'librarytest',
  password: 'testpassword123',
}

// Helper to create test user and libraries
function setupTestData(): string[] {
  // First create the test user
  setupTestUser(LIBRARY_TEST_USER.username, LIBRARY_TEST_USER.password)

  // Then create libraries and associate them with the user
  const result = runDjangoCommand(`
from photonix.photos.models import Library, LibraryUser
from photonix.accounts.models import User

user = User.objects.get(username='${LIBRARY_TEST_USER.username}')

# Create test libraries
lib1 = Library.objects.create(name='Test Library Alpha')
lib2 = Library.objects.create(name='Test Library Beta')
lib3 = Library.objects.create(name='Test Library Gamma')

# Associate libraries with user (required for allLibraries query)
LibraryUser.objects.create(library=lib1, user=user, owner=True)
LibraryUser.objects.create(library=lib2, user=user, owner=True)
LibraryUser.objects.create(library=lib3, user=user, owner=True)

print(f'{lib1.id},{lib2.id},{lib3.id}')
`)
  return result.trim().split(',')
}

// Helper to clean up test data
function cleanupTestData(libraryIds: string[]) {
  const idsStr = libraryIds.map((id) => `'${id}'`).join(',')
  runDjangoCommand(`
from photonix.photos.models import Library, LibraryUser

# Delete library-user associations
LibraryUser.objects.filter(library_id__in=[${idsStr}]).delete()

# Delete test libraries
Library.objects.filter(id__in=[${idsStr}]).delete()
`)
  // Clean up the test user
  cleanupTestUser(LIBRARY_TEST_USER.username)
}

// Helper to login with library test user
async function loginLibraryUser(page: import('@playwright/test').Page) {
  await login(page, LIBRARY_TEST_USER.username, LIBRARY_TEST_USER.password)
}

test.describe.serial('Library Switching', () => {
  let testLibraryIds: string[] = []

  test.beforeAll(async () => {
    // Create test user and libraries in the database
    testLibraryIds = setupTestData()
  })

  test.afterAll(async () => {
    // Clean up test data
    if (testLibraryIds.length > 0) {
      cleanupTestData(testLibraryIds)
    }
  })

  test.beforeEach(async ({ context }) => {
    // Clear cookies and localStorage before each test
    await context.clearCookies()
  })

  test('displays libraries in header menu', async ({ page }) => {
    // Login first
    await loginLibraryUser(page)

    // Wait for page to fully load and GraphQL to fetch libraries
    await page.waitForLoadState('networkidle')

    // Open header menu
    await page.getByTestId('header-menu-button').click()

    // Wait for menu to be visible and libraries to load
    // Look for any library item first to ensure menu is populated
    await expect(
      page.locator('[data-testid^="library-item-"]').first()
    ).toBeVisible({ timeout: 10000 })

    // Check that test libraries are visible
    await expect(
      page.getByTestId(`library-name-${testLibraryIds[0]}`)
    ).toHaveText('Test Library Alpha')
    await expect(
      page.getByTestId(`library-name-${testLibraryIds[1]}`)
    ).toHaveText('Test Library Beta')
    await expect(
      page.getByTestId(`library-name-${testLibraryIds[2]}`)
    ).toHaveText('Test Library Gamma')
  })

  test('shows active indicator on first library by default', async ({
    page,
  }) => {
    // Clear localStorage to ensure fresh state
    await page.goto('/login')
    await page.evaluate(() => localStorage.clear())
    await loginLibraryUser(page)

    // Open header menu
    await page.getByTestId('header-menu-button').click()

    // Wait for libraries to load
    await expect(
      page.getByTestId(`library-item-${testLibraryIds[0]}`)
    ).toBeVisible()

    // First library should have the active indicator (or whichever is first in the list)
    // Note: The order might vary, so we check that exactly one library has the indicator
    const activeIndicators = page.locator('[data-testid^="library-active-indicator-"]')
    await expect(activeIndicators).toHaveCount(1)
  })

  test('switches active library when clicked', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.evaluate(() => localStorage.clear())
    await loginLibraryUser(page)

    // Open header menu
    await page.getByTestId('header-menu-button').click()

    // Wait for libraries to load
    await expect(
      page.getByTestId(`library-item-${testLibraryIds[1]}`)
    ).toBeVisible()

    // Click on the second test library (Beta)
    await page.getByTestId(`library-item-${testLibraryIds[1]}`).click()

    // Menu should close, reopen it
    await page.getByTestId('header-menu-button').click()

    // Beta library should now have the active indicator
    await expect(
      page.getByTestId(`library-active-indicator-${testLibraryIds[1]}`)
    ).toBeVisible()

    // Other test libraries should NOT have active indicator
    await expect(
      page.getByTestId(`library-active-indicator-${testLibraryIds[0]}`)
    ).not.toBeVisible()
    await expect(
      page.getByTestId(`library-active-indicator-${testLibraryIds[2]}`)
    ).not.toBeVisible()
  })

  test('persists active library selection across page refresh', async ({
    page,
  }) => {
    // Login
    await page.goto('/login')
    await page.evaluate(() => localStorage.clear())
    await loginLibraryUser(page)

    // Open header menu and select Gamma library
    await page.getByTestId('header-menu-button').click()
    await expect(
      page.getByTestId(`library-item-${testLibraryIds[2]}`)
    ).toBeVisible()
    await page.getByTestId(`library-item-${testLibraryIds[2]}`).click()

    // Refresh the page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Verify we're still on the home page (session persisted)
    await expect(page).toHaveURL('/')

    // Wait for the header to be visible and stable
    await expect(page.getByTestId('header-menu-button')).toBeVisible()

    // Open header menu again
    await page.getByTestId('header-menu-button').click()

    // Gamma library should still be active
    await expect(
      page.getByTestId(`library-active-indicator-${testLibraryIds[2]}`)
    ).toBeVisible()
  })

  test('active indicator moves when switching between libraries', async ({
    page,
  }) => {
    // Login
    await page.goto('/login')
    await page.evaluate(() => localStorage.clear())
    await loginLibraryUser(page)

    // Switch through all three libraries and verify indicator moves
    for (let i = 0; i < testLibraryIds.length; i++) {
      // Open menu
      await page.getByTestId('header-menu-button').click()

      // Wait for menu to be visible
      await expect(
        page.getByTestId(`library-item-${testLibraryIds[i]}`)
      ).toBeVisible()

      // Click on library
      await page.getByTestId(`library-item-${testLibraryIds[i]}`).click()

      // Reopen menu to verify
      await page.getByTestId('header-menu-button').click()

      // Check this library has the active indicator
      await expect(
        page.getByTestId(`library-active-indicator-${testLibraryIds[i]}`)
      ).toBeVisible()

      // Check other libraries don't have active indicator
      for (let j = 0; j < testLibraryIds.length; j++) {
        if (j !== i) {
          await expect(
            page.getByTestId(`library-active-indicator-${testLibraryIds[j]}`)
          ).not.toBeVisible()
        }
      }

      // Close menu before next iteration
      await page.keyboard.press('Escape')
    }
  })
})
