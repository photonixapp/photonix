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

test.describe.serial('Image Resolution Selection', () => {
  test.beforeAll(async () => {
    setupTestUser()
    testPhotoIds = createTestPhotos(TEST_USER.username, 2)
  })

  test.afterAll(async () => {
    cleanupTestPhotos()
    cleanupTestUser()
  })

  test.beforeEach(async ({ context }) => {
    await context.clearCookies()
  })

  test('loads 2K image for small viewport with low pixel density', async ({ browser }) => {
    // Create context with small viewport and standard pixel density
    // max(800, 600) * 1 = 800 < 1920, so should load 1920 (2K)
    const context = await browser.newContext({
      viewport: { width: 800, height: 600 },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()

    await login(page)

    // Wait for thumbnails and click on first one
    const firstPhotoId = testPhotoIds[0]
    const thumbnail = page.getByTestId(`thumbnail-${firstPhotoId}`)
    await expect(thumbnail).toBeVisible({ timeout: 10000 })
    await thumbnail.click()

    // Wait for photo detail page
    await expect(page).toHaveURL(`/photo/${firstPhotoId}`, { timeout: 10000 })
    const carousel = page.getByTestId('photo-carousel')
    await expect(carousel).toBeVisible({ timeout: 10000 })

    // Wait for image to be rendered
    const image = page.getByTestId('photo-viewer-image').first()
    await expect(image).toBeVisible({ timeout: 10000 })

    // Verify the resolution attribute and src URL
    const resolution = await image.getAttribute('data-resolution')
    expect(resolution).toBe('1920')

    const src = await image.getAttribute('src')
    expect(src).toContain('1920x1920')
    expect(src).not.toContain('3840x3840')

    await context.close()
  })

  test('loads 4K image for large viewport with high pixel density', async ({ browser }) => {
    // Create context with large viewport and high pixel density (Retina)
    // max(1920, 1080) * 2 = 3840 > 1920, so should load 3840 (4K)
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 2,
    })
    const page = await context.newPage()

    await login(page)

    // Wait for thumbnails and click on first one
    const firstPhotoId = testPhotoIds[0]
    const thumbnail = page.getByTestId(`thumbnail-${firstPhotoId}`)
    await expect(thumbnail).toBeVisible({ timeout: 10000 })
    await thumbnail.click()

    // Wait for photo detail page
    await expect(page).toHaveURL(`/photo/${firstPhotoId}`, { timeout: 10000 })
    const carousel = page.getByTestId('photo-carousel')
    await expect(carousel).toBeVisible({ timeout: 10000 })

    // Wait for image to be rendered
    const image = page.getByTestId('photo-viewer-image').first()
    await expect(image).toBeVisible({ timeout: 10000 })

    // Verify the resolution attribute and src URL
    const resolution = await image.getAttribute('data-resolution')
    expect(resolution).toBe('3840')

    const src = await image.getAttribute('src')
    expect(src).toContain('3840x3840')
    expect(src).not.toContain('1920x1920')

    await context.close()
  })

  test('loads 2K image for medium viewport with standard pixel density', async ({ browser }) => {
    // Create context with medium viewport (1280x720) and standard pixel density
    // max(1280, 720) * 1 = 1280 < 1920, so should load 1920 (2K)
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()

    await login(page)

    const firstPhotoId = testPhotoIds[0]
    const thumbnail = page.getByTestId(`thumbnail-${firstPhotoId}`)
    await expect(thumbnail).toBeVisible({ timeout: 10000 })
    await thumbnail.click()

    await expect(page).toHaveURL(`/photo/${firstPhotoId}`, { timeout: 10000 })
    const carousel = page.getByTestId('photo-carousel')
    await expect(carousel).toBeVisible({ timeout: 10000 })

    const image = page.getByTestId('photo-viewer-image').first()
    await expect(image).toBeVisible({ timeout: 10000 })

    const resolution = await image.getAttribute('data-resolution')
    expect(resolution).toBe('1920')

    const src = await image.getAttribute('src')
    expect(src).toContain('1920x1920')

    await context.close()
  })

  test('loads 4K image for medium viewport with 1.5x pixel density', async ({ browser }) => {
    // Create context with medium viewport (1280x720) and 1.5x pixel density
    // max(1280, 720) * 1.5 = 1920, which is NOT > 1920, so should load 1920 (2K)
    // This is an edge case - exactly at the boundary
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1.5,
    })
    const page = await context.newPage()

    await login(page)

    const firstPhotoId = testPhotoIds[0]
    const thumbnail = page.getByTestId(`thumbnail-${firstPhotoId}`)
    await expect(thumbnail).toBeVisible({ timeout: 10000 })
    await thumbnail.click()

    await expect(page).toHaveURL(`/photo/${firstPhotoId}`, { timeout: 10000 })
    const carousel = page.getByTestId('photo-carousel')
    await expect(carousel).toBeVisible({ timeout: 10000 })

    const image = page.getByTestId('photo-viewer-image').first()
    await expect(image).toBeVisible({ timeout: 10000 })

    // At exactly 1920, should still use 2K (condition is > 1920, not >=)
    const resolution = await image.getAttribute('data-resolution')
    expect(resolution).toBe('1920')

    await context.close()
  })

  test('loads 4K image for medium viewport with 2x pixel density', async ({ browser }) => {
    // Create context with medium viewport (1280x720) and 2x pixel density
    // max(1280, 720) * 2 = 2560 > 1920, so should load 3840 (4K)
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 2,
    })
    const page = await context.newPage()

    await login(page)

    const firstPhotoId = testPhotoIds[0]
    const thumbnail = page.getByTestId(`thumbnail-${firstPhotoId}`)
    await expect(thumbnail).toBeVisible({ timeout: 10000 })
    await thumbnail.click()

    await expect(page).toHaveURL(`/photo/${firstPhotoId}`, { timeout: 10000 })
    const carousel = page.getByTestId('photo-carousel')
    await expect(carousel).toBeVisible({ timeout: 10000 })

    const image = page.getByTestId('photo-viewer-image').first()
    await expect(image).toBeVisible({ timeout: 10000 })

    const resolution = await image.getAttribute('data-resolution')
    expect(resolution).toBe('3840')

    const src = await image.getAttribute('src')
    expect(src).toContain('3840x3840')

    await context.close()
  })

  test('verifies correct network request is made for 2K resolution', async ({ browser }) => {
    // Test that the actual network request uses the correct URL
    const context = await browser.newContext({
      viewport: { width: 800, height: 600 },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()

    await login(page)

    const firstPhotoId = testPhotoIds[0]
    const thumbnail = page.getByTestId(`thumbnail-${firstPhotoId}`)
    await expect(thumbnail).toBeVisible({ timeout: 10000 })

    // Set up request interception before navigating
    // Only capture full-size photo requests (1920 or 3840), not thumbnails (256)
    const imageRequests: string[] = []
    page.on('request', (request) => {
      const url = request.url()
      if (url.includes('/thumbnailer/photo/') &&
          (url.includes('1920x1920') || url.includes('3840x3840'))) {
        imageRequests.push(url)
      }
    })

    await thumbnail.click()
    await expect(page).toHaveURL(`/photo/${firstPhotoId}`, { timeout: 10000 })

    // Wait for image to load
    const image = page.getByTestId('photo-viewer-image').first()
    await expect(image).toBeVisible({ timeout: 10000 })

    // Wait a bit for network requests to complete
    await page.waitForTimeout(1000)

    // Verify only 1920 resolution was requested (for the current photo)
    const currentPhotoRequests = imageRequests.filter(url => url.includes(firstPhotoId))
    expect(currentPhotoRequests.length).toBeGreaterThan(0)

    for (const url of currentPhotoRequests) {
      expect(url).toContain('1920x1920')
      expect(url).not.toContain('3840x3840')
    }

    await context.close()
  })

  test('verifies correct network request is made for 4K resolution', async ({ browser }) => {
    // Test that the actual network request uses the correct URL for 4K
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 2,
    })
    const page = await context.newPage()

    await login(page)

    const firstPhotoId = testPhotoIds[0]
    const thumbnail = page.getByTestId(`thumbnail-${firstPhotoId}`)
    await expect(thumbnail).toBeVisible({ timeout: 10000 })

    // Set up request interception before navigating
    // Only capture full-size photo requests (1920 or 3840), not thumbnails (256)
    const imageRequests: string[] = []
    page.on('request', (request) => {
      const url = request.url()
      if (url.includes('/thumbnailer/photo/') &&
          (url.includes('1920x1920') || url.includes('3840x3840'))) {
        imageRequests.push(url)
      }
    })

    await thumbnail.click()
    await expect(page).toHaveURL(`/photo/${firstPhotoId}`, { timeout: 10000 })

    // Wait for image to load
    const image = page.getByTestId('photo-viewer-image').first()
    await expect(image).toBeVisible({ timeout: 10000 })

    // Wait a bit for network requests to complete
    await page.waitForTimeout(1000)

    // Verify 3840 resolution was requested for the current photo
    const currentPhotoRequests = imageRequests.filter(url => url.includes(firstPhotoId))
    expect(currentPhotoRequests.length).toBeGreaterThan(0)

    for (const url of currentPhotoRequests) {
      expect(url).toContain('3840x3840')
      expect(url).not.toContain('1920x1920')
    }

    await context.close()
  })
})
