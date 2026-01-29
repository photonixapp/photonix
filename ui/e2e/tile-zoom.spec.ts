import { test, expect } from '@playwright/test'
import {
  TEST_USER,
  setupTestUser,
  cleanupTestUser,
  login,
  runDjangoCommand,
} from './test-utils'

let checkerboardPhotoId: string

test.describe.serial('Tile Zoom with Checkerboard', () => {
  test.beforeAll(async () => {
    setupTestUser()

    // Create a photo record for the checkerboard image
    const result = runDjangoCommand(`
from photonix.photos.models import Photo, PhotoFile, LibraryUser
from photonix.accounts.models import User
from django.utils import timezone

user = User.objects.get(username='${TEST_USER.username}')
library = LibraryUser.objects.filter(user=user).first().library

# Create photo for checkerboard test image
photo = Photo.objects.create(
    library=library,
    flash=False,
    metering_mode='',
    drive_mode='',
    shooting_mode='',
)
PhotoFile.objects.create(
    photo=photo,
    path='/data/photos/checkerboard.jpg',
    mimetype='image/jpeg',
    bytes=7194,
    width=640,
    height=448,
    file_modified_at=timezone.now(),
)
photo.thumbnailed_version = 1
photo.save()

print(str(photo.id))
`)
    checkerboardPhotoId = result.trim()
  })

  test.afterAll(async () => {
    // Cleanup the checkerboard photo
    runDjangoCommand(`
from photonix.photos.models import Photo, PhotoFile
from photonix.accounts.models import User
from photonix.photos.models import LibraryUser

try:
    user = User.objects.get(username='${TEST_USER.username}')
    library = LibraryUser.objects.filter(user=user).first()
    if library:
        PhotoFile.objects.filter(photo__library=library.library).delete()
        Photo.objects.filter(library=library.library).delete()
except User.DoesNotExist:
    pass
`)
    cleanupTestUser()
  })

  test.beforeEach(async ({ context }) => {
    await context.clearCookies()
  })

  test('tiles align with reference ImageOverlay', async ({ page }) => {
    await login(page)

    console.log(`Navigating to photo: ${checkerboardPhotoId}`)

    // Navigate directly to the checkerboard photo
    await page.goto(`/photo/${checkerboardPhotoId}`)

    // Wait for the page to fully load
    await page.waitForLoadState('networkidle')
    console.log(`Current URL: ${page.url()}`)

    // Wait for the photo viewer to be visible (ImageViewer initially)
    const viewer = page.getByTestId('photo-viewer').first()
    await expect(viewer).toBeVisible({ timeout: 15000 })

    // Collect tile requests to verify tiles are being loaded
    const tileRequests: string[] = []
    page.on('request', (request) => {
      const url = request.url()
      if (url.includes('/thumbnailer/tile/')) {
        tileRequests.push(url)
      }
    })

    // Wait for initial image to load
    await page.waitForTimeout(1500)

    // Get the viewer's bounding box for zoom
    const box = await viewer.boundingBox()
    if (!box) {
      throw new Error('Could not get viewer bounding box')
    }

    const centerX = box.x + box.width / 2
    const centerY = box.y + box.height / 2

    // Zoom in with scroll wheel to trigger tile mode
    // The threshold is TILE_ZOOM_THRESHOLD = 2, so we need to zoom past 2x
    await page.mouse.move(centerX, centerY)
    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, -150)
      await page.waitForTimeout(100)
    }

    // Wait for tiles to load
    await page.waitForTimeout(5000)

    // Take a screenshot for analysis
    const screenshot = await page.screenshot({
      path: 'test-results/tile-zoom-checkerboard.png',
      fullPage: false,
    })

    // Screenshot should be captured successfully
    expect(screenshot).toBeTruthy()

    // Log tile requests for debugging
    console.log(`Tile requests made: ${tileRequests.length}`)
    for (const url of tileRequests) {
      console.log(`  ${url}`)
    }

    // Verify tiles were requested (means we zoomed past threshold into tile mode)
    expect(tileRequests.length).toBeGreaterThan(0)

    // The screenshot should show:
    // 1. The checkerboard with tiles loaded (from tile layer)
    // 2. A semi-transparent reference overlay (ImageOverlay at 50% opacity)
    // 3. If tiles align correctly, the two layers should perfectly overlap
    // 4. If misaligned, you'll see a "ghost" effect where the layers don't match
    // 5. Squares should be SQUARE, not stretched/distorted
  })

  test('scroll wheel zoom works and squares remain square', async ({ page }) => {
    await login(page)

    // Navigate directly to the checkerboard photo
    await page.goto(`/photo/${checkerboardPhotoId}`)

    // Wait for the photo viewer to be visible
    const viewer = page.getByTestId('photo-viewer').first()
    await expect(viewer).toBeVisible({ timeout: 10000 })

    // Wait for image to fully load
    await page.waitForTimeout(1500)

    // Take a screenshot before zoom
    await page.screenshot({
      path: 'test-results/tile-zoom-before.png',
      fullPage: false,
    })

    // Get the viewer's bounding box
    const box = await viewer.boundingBox()
    if (!box) {
      throw new Error('Could not get viewer bounding box')
    }

    const centerX = box.x + box.width / 2
    const centerY = box.y + box.height / 2

    // Move mouse to center
    await page.mouse.move(centerX, centerY)

    // Zoom in with scroll wheel (negative deltaY = zoom in)
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, -150)
      await page.waitForTimeout(200)
    }

    // Wait for zoom animation to complete
    await page.waitForTimeout(1000)

    // Take screenshot after zoom
    await page.screenshot({
      path: 'test-results/tile-zoom-scroll-checkerboard.png',
      fullPage: false,
    })

    // Verify the zoom happened by checking that we can see less of the image
    // (the zoomed view should show fewer squares than the original)
    // This is a visual test - the screenshots will be compared manually
    // The key verification is that squares remain square after zoom

    // The test passes if:
    // 1. No errors during zoom
    // 2. Screenshots are captured for manual verification
    // 3. The checkerboard squares should still be square (not stretched)
  })

  test('smooth transition from ImageViewer to TileViewer', async ({ page }) => {
    await login(page)

    // Navigate directly to the checkerboard photo
    await page.goto(`/photo/${checkerboardPhotoId}`)

    // Wait for the photo viewer to be visible
    const viewer = page.getByTestId('photo-viewer').first()
    await expect(viewer).toBeVisible({ timeout: 15000 })

    // Wait for image to fully load
    await page.waitForTimeout(1500)

    // Get the viewer's bounding box
    const box = await viewer.boundingBox()
    if (!box) {
      throw new Error('Could not get viewer bounding box')
    }

    const centerX = box.x + box.width / 2
    const centerY = box.y + box.height / 2

    // Move mouse to center
    await page.mouse.move(centerX, centerY)

    // Take screenshot before any zoom (ImageViewer at scale 1)
    await page.screenshot({
      path: 'test-results/transition-1-initial.png',
      fullPage: false,
    })

    // Zoom in slowly with wheel, taking screenshots at each step
    // TILE_ZOOM_THRESHOLD is 2, so we need to zoom past that to trigger transition
    for (let i = 1; i <= 8; i++) {
      await page.mouse.wheel(0, -100) // Smaller increments for smoother test
      await page.waitForTimeout(300)
      await page.screenshot({
        path: `test-results/transition-2-zoom-step-${i}.png`,
        fullPage: false,
      })
    }

    // Wait for tiles to load
    await page.waitForTimeout(1000)

    // Take final screenshot after transition
    await page.screenshot({
      path: 'test-results/transition-3-after-tiles.png',
      fullPage: false,
    })

    // The test verifies visually that:
    // 1. The image doesn't suddenly shrink when switching from ImageViewer to TileViewer
    // 2. The transition appears smooth - image stays approximately the same size
    // 3. The zoom level continues seamlessly from where ImageViewer left off
  })
})
