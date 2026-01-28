import { test, expect } from '@playwright/test'
import {
  TEST_USER,
  setupTestUser,
  cleanupTestUser,
  login,
  createTestPhotos,
  cleanupTestPhotos,
} from './test-utils'

let testPhotoIds: string[] = []

test.describe.serial('Search Bar', () => {
  test.beforeAll(async () => {
    setupTestUser()
    // Create photos with various tags for search testing
    testPhotoIds = createTestPhotos(TEST_USER.username, 5, {
      tags: [
        { name: 'Beach', type: 'L' },
        { name: 'Mountain', type: 'L' },
        { name: 'Sunset', type: 'S' },
      ],
    })
  })

  test.afterAll(async () => {
    cleanupTestPhotos()
    cleanupTestUser()
  })

  test.beforeEach(async ({ context }) => {
    await context.clearCookies()
  })

  test('search bar is visible on home page', async ({ page }) => {
    await login(page)
    await expect(page.getByTestId('search-bar')).toBeVisible()
    await expect(page.getByTestId('search-input')).toBeVisible()
  })

  test('typing shows autocomplete dropdown with matching tags', async ({
    page,
  }) => {
    await login(page)

    const searchInput = page.getByTestId('search-input')
    await searchInput.fill('Beach')

    // Wait for debounce and dropdown to appear
    await expect(page.getByTestId('autocomplete-dropdown')).toBeVisible({
      timeout: 5000,
    })
    // Should show Beach option
    await expect(
      page.locator('[data-testid^="autocomplete-option-"]', {
        hasText: 'Beach',
      })
    ).toBeVisible()
  })

  test('keyboard navigation works in dropdown', async ({ page }) => {
    await login(page)

    const searchInput = page.getByTestId('search-input')
    // Type something that matches multiple tags
    await searchInput.fill('a')

    await expect(page.getByTestId('autocomplete-dropdown')).toBeVisible({
      timeout: 5000,
    })

    // First option should be active by default (aria-selected=true)
    const options = page.locator('[data-testid^="autocomplete-option-"]')
    const optionCount = await options.count()

    if (optionCount > 1) {
      // Arrow down to select second option
      await page.keyboard.press('ArrowDown')

      // Second option should now be active
      await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true')

      // Arrow up to go back to first
      await page.keyboard.press('ArrowUp')
      await expect(options.nth(0)).toHaveAttribute('aria-selected', 'true')
    }
  })

  test('selecting filter adds pill and clears input', async ({ page }) => {
    await login(page)

    const searchInput = page.getByTestId('search-input')
    await searchInput.fill('Beach')

    await expect(page.getByTestId('autocomplete-dropdown')).toBeVisible({
      timeout: 5000,
    })

    // Click on the Beach option
    await page
      .locator('[data-testid^="autocomplete-option-"]', { hasText: 'Beach' })
      .click()

    // Should see filter pill
    await expect(
      page.locator('[data-testid^="filter-pill-"]', { hasText: 'Beach' })
    ).toBeVisible()

    // Input should be cleared
    await expect(searchInput).toHaveValue('')

    // Dropdown should be closed
    await expect(page.getByTestId('autocomplete-dropdown')).not.toBeVisible()
  })

  test('Enter key selects active option', async ({ page }) => {
    await login(page)

    const searchInput = page.getByTestId('search-input')
    await searchInput.fill('Mountain')

    await expect(page.getByTestId('autocomplete-dropdown')).toBeVisible({
      timeout: 5000,
    })

    // Press Enter to select first matching option
    await page.keyboard.press('Enter')

    // Should see filter pill
    await expect(
      page.locator('[data-testid^="filter-pill-"]', { hasText: 'Mountain' })
    ).toBeVisible()
  })

  test('removing pill with X button', async ({ page }) => {
    await login(page)

    // Add a filter
    const searchInput = page.getByTestId('search-input')
    await searchInput.fill('Sunset')
    await expect(page.getByTestId('autocomplete-dropdown')).toBeVisible({
      timeout: 5000,
    })
    await page
      .locator('[data-testid^="autocomplete-option-"]', { hasText: 'Sunset' })
      .click()

    // Verify pill exists
    const pill = page.locator('[data-testid^="filter-pill-"]', {
      hasText: 'Sunset',
    })
    await expect(pill).toBeVisible()

    // Click remove button on pill
    await pill.locator('[data-testid^="filter-pill-remove-"]').click()

    // Pill should be gone
    await expect(pill).not.toBeVisible()
  })

  test('backspace removes last pill when input is empty', async ({ page }) => {
    await login(page)

    // Add a filter
    const searchInput = page.getByTestId('search-input')
    await searchInput.fill('Beach')
    await expect(page.getByTestId('autocomplete-dropdown')).toBeVisible({
      timeout: 5000,
    })
    await page
      .locator('[data-testid^="autocomplete-option-"]', { hasText: 'Beach' })
      .click()

    // Verify pill exists
    const pill = page.locator('[data-testid^="filter-pill-"]', {
      hasText: 'Beach',
    })
    await expect(pill).toBeVisible()

    // Focus input (should already be focused) and press backspace
    await searchInput.focus()
    await expect(searchInput).toHaveValue('')
    await page.keyboard.press('Backspace')

    // Pill should be removed
    await expect(pill).not.toBeVisible()
  })

  test('clear all button removes all filters and input text', async ({
    page,
  }) => {
    await login(page)

    // Add a filter
    const searchInput = page.getByTestId('search-input')
    await searchInput.fill('Beach')
    await expect(page.getByTestId('autocomplete-dropdown')).toBeVisible({
      timeout: 5000,
    })
    await page
      .locator('[data-testid^="autocomplete-option-"]', { hasText: 'Beach' })
      .click()

    // Type something in the input
    await searchInput.fill('test')

    // Clear all button should be visible
    const clearButton = page.getByTestId('search-clear-all')
    await expect(clearButton).toBeVisible()

    // Click clear all
    await clearButton.click()

    // Everything should be cleared
    await expect(
      page.locator('[data-testid^="filter-pill-"]')
    ).not.toBeVisible()
    await expect(searchInput).toHaveValue('')
  })

  test('Escape key closes dropdown', async ({ page }) => {
    await login(page)

    const searchInput = page.getByTestId('search-input')
    await searchInput.fill('Beach')

    await expect(page.getByTestId('autocomplete-dropdown')).toBeVisible({
      timeout: 5000,
    })

    await page.keyboard.press('Escape')

    await expect(page.getByTestId('autocomplete-dropdown')).not.toBeVisible()
  })

  test('clicking outside closes dropdown', async ({ page }) => {
    await login(page)

    const searchInput = page.getByTestId('search-input')
    await searchInput.fill('Beach')

    await expect(page.getByTestId('autocomplete-dropdown')).toBeVisible({
      timeout: 5000,
    })

    // Click outside the search bar (on the page body)
    await page.click('body', { position: { x: 10, y: 10 } })

    await expect(page.getByTestId('autocomplete-dropdown')).not.toBeVisible()
  })
})
