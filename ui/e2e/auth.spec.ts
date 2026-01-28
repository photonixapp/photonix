import { test, expect } from '@playwright/test'
import {
  TEST_USER,
  setupTestUser,
  cleanupTestUser,
  login,
} from './test-utils'

test.describe.serial('Authentication Flow', () => {
  test.beforeAll(async () => {
    // Create test user in the database
    setupTestUser()
  })

  test.afterAll(async () => {
    // Clean up test user
    cleanupTestUser()
  })

  test.beforeEach(async ({ context }) => {
    // Clear cookies before each test
    await context.clearCookies()
  })

  test('redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/')

    // Should redirect to login with next param
    await expect(page).toHaveURL(/\/login\?next=/)

    // Login form should be visible
    await expect(page.getByTestId('username-input')).toBeVisible()
    await expect(page.getByTestId('password-input')).toBeVisible()
    await expect(page.getByTestId('login-button')).toBeVisible()
  })

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login')

    // Enter invalid credentials
    await page.getByTestId('username-input').fill('wronguser')
    await page.getByTestId('password-input').fill('wrongpassword')
    await page.getByTestId('login-button').click()

    // Should show error message
    await expect(page.getByTestId('login-error')).toBeVisible()
  })

  test('successful login redirects to home', async ({ page }) => {
    await page.goto('/login')

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle')

    // Enter test credentials
    await page.getByTestId('username-input').fill(TEST_USER.username)
    await page.getByTestId('password-input').fill(TEST_USER.password)
    await page.getByTestId('login-button').click()

    // Should redirect to home page
    await expect(page).toHaveURL('/', { timeout: 10000 })

    // Should show logged in user
    await expect(page.getByTestId('logged-in-user')).toContainText(
      TEST_USER.username
    )
  })

  test('logout clears session and redirects to login', async ({ page }) => {
    // First login using shared helper
    await login(page)

    // Open header menu
    await page.getByTestId('header-menu-button').click()

    // Click logout
    await page.getByTestId('logout-link').click()

    // Should show logout message
    await expect(page.getByTestId('logout-message')).toBeVisible()

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
  })

  test('session persists across page refresh', async ({ page }) => {
    // Login using shared helper
    await login(page)

    // Should show logged in user
    await expect(page.getByTestId('logged-in-user')).toContainText(
      TEST_USER.username
    )

    // Refresh page
    await page.reload()

    // Should still be logged in
    await expect(page).toHaveURL('/')
    await expect(page.getByTestId('logged-in-user')).toContainText(
      TEST_USER.username
    )
  })
})
