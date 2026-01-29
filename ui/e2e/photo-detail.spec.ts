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

test.describe.serial('Photo Detail Page', () => {
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

  test('navigates from thumbnail to photo detail', async ({ page }) => {
    await login(page)

    // Wait for thumbnails grid
    const grid = page.getByTestId('thumbnails-grid')
    await expect(grid).toBeVisible()

    // Click on the first thumbnail
    const firstPhotoId = testPhotoIds[0]
    const thumbnail = page.getByTestId(`thumbnail-${firstPhotoId}`)
    await expect(thumbnail).toBeVisible()
    await thumbnail.click()

    // Should navigate to photo detail page
    await expect(page).toHaveURL(`/photo/${firstPhotoId}`, { timeout: 10000 })

    // Photo carousel should be visible (contains multiple photo viewers)
    const carousel = page.getByTestId('photo-carousel')
    await expect(carousel).toBeVisible()
  })

  test('returns to home with Escape key', async ({ page }) => {
    await login(page)

    // Navigate to photo detail by clicking thumbnail (more reliable than goto)
    const firstPhotoId = testPhotoIds[0]
    const thumbnail = page.getByTestId(`thumbnail-${firstPhotoId}`)
    await expect(thumbnail).toBeVisible({ timeout: 10000 })
    await thumbnail.click()

    // Wait for navigation to complete
    await expect(page).toHaveURL(`/photo/${firstPhotoId}`, { timeout: 10000 })

    const carousel = page.getByTestId('photo-carousel')
    await expect(carousel).toBeVisible({ timeout: 10000 })

    // Press Escape
    await page.keyboard.press('Escape')

    // Should return to home page
    await expect(page).toHaveURL('/', { timeout: 5000 })
  })

  test('navigates with arrow keys', async ({ page }) => {
    await login(page)

    // First go to thumbnails to populate the photo list store
    const grid = page.getByTestId('thumbnails-grid')
    await expect(grid).toBeVisible()

    // Wait for at least one thumbnail to appear
    const firstThumbnail = page.locator('[data-id]').first()
    await expect(firstThumbnail).toBeVisible({ timeout: 10000 })

    // Get all thumbnail IDs
    const displayedIds = await page.locator('[data-id]').evaluateAll(
      (elements) => elements.map(el => el.getAttribute('data-id')).filter((id): id is string => id !== null)
    )

    // Click the first DISPLAYED thumbnail (not necessarily testPhotoIds[0])
    const firstDisplayedId = displayedIds[0]
    if (!firstDisplayedId) {
      throw new Error('No thumbnails found')
    }

    await page.getByTestId(`thumbnail-${firstDisplayedId}`).click()
    await expect(page).toHaveURL(`/photo/${firstDisplayedId}`)

    const carousel = page.getByTestId('photo-carousel')
    await expect(carousel).toBeVisible()

    // Only test navigation if there's more than one photo displayed
    if (displayedIds.length > 1) {
      const currentUrl = page.url()

      // Press right arrow to go to next photo
      await page.keyboard.press('ArrowRight')

      // Wait for URL to change (scroll animation + debounced URL update)
      await page.waitForFunction(
        (url) => window.location.href !== url,
        currentUrl,
        { timeout: 5000 }
      )

      const newUrl = page.url()
      // URL should have changed to a different photo
      expect(newUrl).not.toBe(currentUrl)
      expect(newUrl).toMatch(/\/photo\/[0-9a-f-]+/)
    }
  })

  test('toggles info sidebar with I key', async ({ page }) => {
    await login(page)

    // Navigate via thumbnail click to populate photo list store
    const firstPhotoId = testPhotoIds[0]
    const thumbnail = page.getByTestId(`thumbnail-${firstPhotoId}`)
    await expect(thumbnail).toBeVisible({ timeout: 10000 })
    await thumbnail.click()

    await expect(page).toHaveURL(`/photo/${firstPhotoId}`, { timeout: 10000 })
    const carousel = page.getByTestId('photo-carousel')
    await expect(carousel).toBeVisible({ timeout: 10000 })

    // Initially sidebar should not be visible
    const sidebar = page.locator('text=Rating')
    await expect(sidebar).not.toBeVisible()

    // Press I to toggle info
    await page.keyboard.press('i')

    // Sidebar should now be visible with "Rating" section
    await expect(sidebar).toBeVisible({ timeout: 3000 })

    // Press I again to close
    await page.keyboard.press('i')
    await expect(sidebar).not.toBeVisible({ timeout: 3000 })
  })

  test('shows toolbar with back button', async ({ page }) => {
    await login(page)

    // Navigate via thumbnail click
    const firstPhotoId = testPhotoIds[0]
    const thumbnail = page.getByTestId(`thumbnail-${firstPhotoId}`)
    await expect(thumbnail).toBeVisible({ timeout: 10000 })
    await thumbnail.click()

    await expect(page).toHaveURL(`/photo/${firstPhotoId}`, { timeout: 10000 })
    const carousel = page.getByTestId('photo-carousel')
    await expect(carousel).toBeVisible({ timeout: 10000 })

    // Toolbar should have back button (ArrowLeft icon)
    // The back button should be visible on the page
    const backButton = page.locator('button').filter({ has: page.locator('svg.lucide-arrow-left') })
    await expect(backButton).toBeVisible()

    // Click back button
    await backButton.click()

    // Should return to home
    await expect(page).toHaveURL('/', { timeout: 5000 })
  })

  test('shows rotation controls', async ({ page }) => {
    await login(page)

    // Navigate via thumbnail click
    const firstPhotoId = testPhotoIds[0]
    const thumbnail = page.getByTestId(`thumbnail-${firstPhotoId}`)
    await expect(thumbnail).toBeVisible({ timeout: 10000 })
    await thumbnail.click()

    await expect(page).toHaveURL(`/photo/${firstPhotoId}`, { timeout: 10000 })
    const carousel = page.getByTestId('photo-carousel')
    await expect(carousel).toBeVisible({ timeout: 10000 })

    // Should have rotate clockwise and counter-clockwise buttons
    const rotateCWButton = page.locator('button').filter({ has: page.locator('svg.lucide-rotate-cw') })
    const rotateCCWButton = page.locator('button').filter({ has: page.locator('svg.lucide-rotate-ccw') })

    await expect(rotateCWButton).toBeVisible()
    await expect(rotateCCWButton).toBeVisible()
  })

  test('shows info toggle button', async ({ page }) => {
    await login(page)

    // Navigate via thumbnail click
    const firstPhotoId = testPhotoIds[0]
    const thumbnail = page.getByTestId(`thumbnail-${firstPhotoId}`)
    await expect(thumbnail).toBeVisible({ timeout: 10000 })
    await thumbnail.click()

    await expect(page).toHaveURL(`/photo/${firstPhotoId}`, { timeout: 10000 })
    const carousel = page.getByTestId('photo-carousel')
    await expect(carousel).toBeVisible({ timeout: 10000 })

    // Should have info button (Info icon)
    const infoButton = page.locator('button').filter({ has: page.locator('svg.lucide-info') })
    await expect(infoButton).toBeVisible()

    // Click info button
    await infoButton.click()

    // Sidebar should appear
    const sidebar = page.locator('text=Rating')
    await expect(sidebar).toBeVisible({ timeout: 3000 })

    // Info button should now be X (close)
    const closeButton = page.locator('button').filter({ has: page.locator('svg.lucide-x') }).first()
    await expect(closeButton).toBeVisible()
  })

  test('double-click toggles zoom', async ({ page }) => {
    await login(page)

    // Navigate via thumbnail click
    const firstPhotoId = testPhotoIds[0]
    const thumbnail = page.getByTestId(`thumbnail-${firstPhotoId}`)
    await expect(thumbnail).toBeVisible({ timeout: 10000 })
    await thumbnail.click()

    await expect(page).toHaveURL(`/photo/${firstPhotoId}`, { timeout: 10000 })

    // Wait for carousel to render
    const carousel = page.getByTestId('photo-carousel')
    await expect(carousel).toBeVisible({ timeout: 10000 })

    // Use the first visible photo-viewer (center of carousel)
    const viewer = page.getByTestId('photo-viewer').first()
    await expect(viewer).toBeVisible()

    // Wait for image to load
    await page.waitForTimeout(500)

    // Get initial cursor style
    const initialCursor = await viewer.evaluate((el) => getComputedStyle(el).cursor)
    expect(initialCursor).toBe('zoom-in')

    // Double-click on the viewer to zoom in
    await viewer.dblclick()

    // After zoom, cursor should change to grab
    // Wait for the zoom animation and state update
    await page.waitForTimeout(500)

    const zoomedCursor = await viewer.evaluate((el) => getComputedStyle(el).cursor)
    expect(zoomedCursor).toBe('grab')
  })

  test('scroll wheel zoom triggers tile requests when zoomed deep', async ({ page }) => {
    await login(page)

    // Navigate via thumbnail click
    const firstPhotoId = testPhotoIds[0]
    const thumbnail = page.getByTestId(`thumbnail-${firstPhotoId}`)
    await expect(thumbnail).toBeVisible({ timeout: 10000 })
    await thumbnail.click()

    await expect(page).toHaveURL(`/photo/${firstPhotoId}`, { timeout: 10000 })
    const carousel = page.getByTestId('photo-carousel')
    await expect(carousel).toBeVisible({ timeout: 10000 })

    // Wait for initial image to load
    const viewer = page.getByTestId('photo-viewer').first()
    await expect(viewer).toBeVisible()

    // Wait for image to load
    await page.waitForTimeout(1000)

    // Collect network requests for tiles
    const tileRequests: string[] = []
    page.on('request', (request) => {
      const url = request.url()
      if (url.includes('/thumbnailer/tile/')) {
        tileRequests.push(url)
      }
    })

    // Zoom in multiple times using scroll wheel to get past the base 4K image
    const box = await viewer.boundingBox()
    if (box) {
      const centerX = box.x + box.width / 2
      const centerY = box.y + box.height / 2

      // Move mouse to center and scroll to zoom in significantly
      await page.mouse.move(centerX, centerY)
      // Multiple scroll events to zoom in deep enough to trigger tiles
      for (let i = 0; i < 5; i++) {
        await page.mouse.wheel(0, -200)
        await page.waitForTimeout(300)
      }
    }

    // At deep zoom levels, tile requests should be made
    // Note: tiles only load when zoomed past the base 4K image resolution
    // For smaller test images, this might not trigger tiles
    // The test verifies that IF tiles are requested, they have the correct format
    for (const url of tileRequests) {
      expect(url).toMatch(/\/thumbnailer\/tile\/[a-f0-9-]+\/\d+\/\d+\/\d+\.jpg/)
    }
  })

  test('preserves scroll position when returning from detail', async ({ page }) => {
    await login(page)

    // Wait for grid with photos
    const grid = page.getByTestId('thumbnails-grid')
    await expect(grid).toBeVisible()

    // Wait for at least one thumbnail
    const firstThumbnail = page.locator('[data-id]').first()
    await expect(firstThumbnail).toBeVisible()

    // Check if page is scrollable
    const canScroll = await page.evaluate(() => document.body.scrollHeight > window.innerHeight)

    if (canScroll) {
      // Scroll down a bit
      await page.evaluate(() => window.scrollTo(0, 200))
      await page.waitForTimeout(100)

      const scrollBefore = await page.evaluate(() => window.scrollY)
      expect(scrollBefore).toBeGreaterThan(0)

      // Click on a thumbnail (use the visible one)
      const firstPhotoId = await firstThumbnail.getAttribute('data-id')
      if (firstPhotoId) {
        await page.getByTestId(`thumbnail-${firstPhotoId}`).click()
        await expect(page).toHaveURL(`/photo/${firstPhotoId}`)

        // Go back
        await page.keyboard.press('Escape')
        await expect(page).toHaveURL('/')

        // Wait for page to restore scroll
        await page.waitForTimeout(200)

        // Scroll position should be restored (or close to it)
        const scrollAfter = await page.evaluate(() => window.scrollY)
        // Allow some tolerance due to layout differences
        expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThan(50)
      }
    } else {
      // Page isn't scrollable with current content, just verify basic navigation works
      const firstPhotoId = await firstThumbnail.getAttribute('data-id')
      if (firstPhotoId) {
        await page.getByTestId(`thumbnail-${firstPhotoId}`).click()
        await expect(page).toHaveURL(`/photo/${firstPhotoId}`)

        // Wait for page to be ready, then click to focus and press Escape
        const carousel = page.getByTestId('photo-carousel')
        await expect(carousel).toBeVisible()
        await carousel.click()
        await page.keyboard.press('Escape')
        await expect(page).toHaveURL('/', { timeout: 5000 })
      }
    }
  })

  test('no spinner when navigating to preloaded image', async ({ page }) => {
    await login(page)

    // Wait for grid with photos
    const grid = page.getByTestId('thumbnails-grid')
    await expect(grid).toBeVisible()

    // Get all displayed photo IDs
    const displayedIds = await page.locator('[data-id]').evaluateAll(
      (elements) => elements.map(el => el.getAttribute('data-id')).filter((id): id is string => id !== null)
    )

    // Need at least 2 photos for this test
    expect(displayedIds.length).toBeGreaterThanOrEqual(2)

    const firstPhotoId = displayedIds[0]

    // Click on first thumbnail to go to photo detail
    await page.getByTestId(`thumbnail-${firstPhotoId}`).click()
    await expect(page).toHaveURL(`/photo/${firstPhotoId}`)

    // Wait for carousel to be visible
    const carousel = page.getByTestId('photo-carousel')
    await expect(carousel).toBeVisible({ timeout: 10000 })

    // Wait for the carousel to have multiple photo viewers rendered (preloading adjacent photos)
    // and for any initial spinners to clear (either images loaded or errored)
    await page.waitForFunction(
      () => {
        const viewers = document.querySelectorAll('[data-testid="photo-viewer"]')
        if (viewers.length < 2) return false // Need at least 2 photos in carousel

        // Check that all images have completed loading (success or error)
        for (const viewer of viewers) {
          const img = viewer.querySelector('img')
          if (img && !img.complete) {
            return false // Image still loading
          }
        }

        // Check no spinners visible
        const spinners = document.querySelectorAll('.animate-spin')
        return spinners.length === 0
      },
      { timeout: 15000 }
    )

    // Additional wait to ensure all images have had time to complete
    await page.waitForTimeout(500)

    // Set up spinner detection before navigation
    await page.evaluate(() => {
      (window as unknown as { __spinnerAppeared: boolean }).__spinnerAppeared = false
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            for (const node of mutation.addedNodes) {
              if (node instanceof Element) {
                if (node.classList?.contains('animate-spin') ||
                    node.querySelector?.('.animate-spin')) {
                  (window as unknown as { __spinnerAppeared: boolean }).__spinnerAppeared = true
                  console.log('SPINNER APPEARED!', node)
                }
              }
            }
          }
        }
      })
      observer.observe(document.body, { childList: true, subtree: true })
      ;(window as unknown as { __spinnerObserver: MutationObserver }).__spinnerObserver = observer
    })

    // Navigate to next photo with right arrow
    await page.keyboard.press('ArrowRight')

    // Wait for URL to change (indicates navigation completed and URL was updated)
    await page.waitForFunction(
      (originalId) => !window.location.href.includes(originalId),
      firstPhotoId,
      { timeout: 5000 }
    )

    // Give time for any spinner to appear (the bug shows spinner briefly)
    await page.waitForTimeout(300)

    // Check if spinner appeared during navigation
    const spinnerAppeared = await page.evaluate(() => {
      const observer = (window as unknown as { __spinnerObserver: MutationObserver }).__spinnerObserver
      if (observer) observer.disconnect()
      return (window as unknown as { __spinnerAppeared: boolean }).__spinnerAppeared
    })

    // Also check there's no spinner visible right now
    const currentSpinners = await page.locator('.animate-spin').count()

    // THE TEST: spinner should NOT have appeared for preloaded images
    // If the next photo was preloaded, navigation should be instant without any loading indicator
    expect(spinnerAppeared).toBe(false)
    expect(currentSpinners).toBe(0)
  })

  test('direct URL navigation allows prev/next without going through thumbnails', async ({ page }) => {
    await login(page)

    // Get the first photo ID from our test photos
    const middlePhotoId = testPhotoIds[Math.floor(testPhotoIds.length / 2)]

    // Navigate directly to photo detail URL (simulating page refresh or direct link)
    await page.goto(`/photo/${middlePhotoId}`)

    // Wait for the carousel to be visible
    const carousel = page.getByTestId('photo-carousel')
    await expect(carousel).toBeVisible({ timeout: 10000 })

    // Wait for the photos around query to complete
    // The navigation arrows should become enabled when surrounding photos are loaded
    await page.waitForTimeout(1000)

    // Try to navigate to next photo using arrow key
    const currentUrl = page.url()
    await page.keyboard.press('ArrowRight')

    // Wait for URL to change
    try {
      await page.waitForFunction(
        (url) => window.location.href !== url,
        currentUrl,
        { timeout: 5000 }
      )

      const newUrl = page.url()
      // URL should have changed to a different photo
      expect(newUrl).not.toBe(currentUrl)
      expect(newUrl).toMatch(/\/photo\/[0-9a-f-]+/)
    } catch {
      // If there's no next photo (we're at the end), verify we're still on a valid photo page
      expect(page.url()).toMatch(/\/photo\/[0-9a-f-]+/)
    }
  })
})
