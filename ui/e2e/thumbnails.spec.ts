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

test.describe.serial('Thumbnails Grid', () => {
  test.beforeAll(async () => {
    setupTestUser()
    testPhotoIds = createTestPhotos(TEST_USER.username, 5)
  })

  test.afterAll(async () => {
    cleanupTestPhotos()
    cleanupTestUser()
  })

  test.beforeEach(async ({ context }) => {
    await context.clearCookies()
  })

  test('displays photo thumbnails in a grid', async ({ page }) => {
    await login(page)

    const grid = page.getByTestId('thumbnails-grid')
    await expect(grid).toBeVisible()

    // Should show test photos
    for (const photoId of testPhotoIds.slice(0, 3)) {
      await expect(page.getByTestId(`thumbnail-${photoId}`)).toBeVisible()
    }
  })

  test('selects single thumbnail with Ctrl+click', async ({ page }) => {
    await login(page)

    const grid = page.getByTestId('thumbnails-grid')
    await expect(grid).toBeVisible()

    const firstPhotoId = testPhotoIds[0]
    const thumbnail = page.getByTestId(`thumbnail-${firstPhotoId}`)

    // Ctrl+click to select
    await thumbnail.click({ modifiers: ['Control'] })

    // Should show selection indicator
    await expect(
      page.getByTestId(`thumbnail-selected-${firstPhotoId}`)
    ).toBeVisible()
  })

  test('selects range with Shift+click', async ({ page }) => {
    await login(page)

    const grid = page.getByTestId('thumbnails-grid')
    await expect(grid).toBeVisible()

    // Get the displayed order of thumbnails on the page
    const displayedIds = await page.locator('[data-testid^="thumbnail-"]').evaluateAll(
      (elements) => elements
        .filter(el => el.getAttribute('data-testid')?.match(/^thumbnail-[a-f0-9-]+$/))
        .map(el => el.getAttribute('data-id'))
    )

    // Make sure we have at least 3 photos
    expect(displayedIds.length).toBeGreaterThanOrEqual(3)

    // Use the first and third displayed photos for the range test
    const firstDisplayedId = displayedIds[0]
    const thirdDisplayedId = displayedIds[2]

    // Ctrl+click first displayed photo
    await page
      .getByTestId(`thumbnail-${firstDisplayedId}`)
      .click({ modifiers: ['Control'] })

    // Wait for first selection to complete
    await expect(
      page.getByTestId(`thumbnail-selected-${firstDisplayedId}`)
    ).toBeVisible()

    // Shift+click third displayed photo to select range
    await page
      .getByTestId(`thumbnail-${thirdDisplayedId}`)
      .click({ modifiers: ['Shift'] })

    // All three should be selected (first, second, and third in display order)
    await expect(page.locator('[data-testid^="thumbnail-selected-"]')).toHaveCount(3)
  })

  test('clears selection with Escape key', async ({ page }) => {
    await login(page)

    const grid = page.getByTestId('thumbnails-grid')
    await expect(grid).toBeVisible()

    // Select a photo
    await page
      .getByTestId(`thumbnail-${testPhotoIds[0]}`)
      .click({ modifiers: ['Control'] })
    await expect(
      page.getByTestId(`thumbnail-selected-${testPhotoIds[0]}`)
    ).toBeVisible()

    // Press Escape
    await page.keyboard.press('Escape')

    // Selection should be cleared
    await expect(
      page.getByTestId(`thumbnail-selected-${testPhotoIds[0]}`)
    ).not.toBeVisible()
  })

  test('selects all with Ctrl+A', async ({ page }) => {
    await login(page)

    const grid = page.getByTestId('thumbnails-grid')
    await expect(grid).toBeVisible()

    // Press Ctrl+A
    await page.keyboard.press('Control+a')

    // All photos should be selected
    for (const photoId of testPhotoIds) {
      await expect(
        page.getByTestId(`thumbnail-selected-${photoId}`)
      ).toBeVisible()
    }
  })

  test('deselects all with Ctrl+Shift+A', async ({ page }) => {
    await login(page)

    const grid = page.getByTestId('thumbnails-grid')
    await expect(grid).toBeVisible()

    // Select all first
    await page.keyboard.press('Control+a')

    // Verify at least first one is selected
    await expect(
      page.getByTestId(`thumbnail-selected-${testPhotoIds[0]}`)
    ).toBeVisible()

    // Then deselect all
    await page.keyboard.press('Control+Shift+a')

    // No photos should be selected
    for (const photoId of testPhotoIds) {
      await expect(
        page.getByTestId(`thumbnail-selected-${photoId}`)
      ).not.toBeVisible()
    }
  })

  test('shows star rating on hover and can set rating', async ({ page }) => {
    await login(page)

    const grid = page.getByTestId('thumbnails-grid')
    await expect(grid).toBeVisible()

    const firstPhotoId = testPhotoIds[0]
    const thumbnail = page.getByTestId(`thumbnail-${firstPhotoId}`)

    // Hover over the thumbnail to reveal star rating
    await thumbnail.hover()

    // Wait for stars to appear (they fade in via opacity)
    const starRating = thumbnail.locator('[data-testid="star-rating"]')
    await expect(starRating).toBeVisible({ timeout: 5000 })

    // Click on the 3rd star to set rating
    const stars = starRating.locator('svg')
    await stars.nth(2).click()

    // Verify the star is now filled (rating should persist)
    // After clicking, the first 3 stars should be filled
    await expect(stars.nth(0)).toHaveClass(/fill-white/)
    await expect(stars.nth(1)).toHaveClass(/fill-white/)
    await expect(stars.nth(2)).toHaveClass(/fill-white/)
  })
})
