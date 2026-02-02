import { test, expect } from '@playwright/test'
import {
  TEST_USER,
  setupTestUser,
  cleanupTestUser,
  login,
  runDjangoCommand,
} from './test-utils'

// Photo IDs created for this test
let photoWithBoxesId: string
let photoWithoutBoxesId: string

// Helper to create test photos with bounding boxes
function createPhotosWithBoundingBoxes(username: string): { withBoxes: string; withoutBoxes: string } {
  const result = runDjangoCommand(`
from photonix.photos.models import Photo, PhotoFile, LibraryUser, Tag, PhotoTag
from photonix.accounts.models import User
from django.utils import timezone
from datetime import timedelta

user = User.objects.get(username='${username}')
library = LibraryUser.objects.filter(user=user).first().library

# Create object tags for bounding boxes
car_tag, _ = Tag.objects.get_or_create(
    library=library,
    name='Car',
    type='O',
    defaults={'source': 'C'}
)
truck_tag, _ = Tag.objects.get_or_create(
    library=library,
    name='Truck',
    type='O',
    defaults={'source': 'C'}
)

# Use explicit timestamps so photos are in predictable order
# Photos are ordered by -taken_at (newest first)
# photo1 (with boxes) should be NEWER so it comes first
# photo2 (without boxes) should be OLDER so pressing Right navigates to it
now = timezone.now()

# Photo 1: With bounding boxes (red test image) - NEWER
photo1 = Photo.objects.create(
    library=library,
    taken_at=now,
    star_rating=3,
    flash=False,
    metering_mode='',
    drive_mode='',
    shooting_mode='',
)
PhotoFile.objects.create(
    photo=photo1,
    path='/data/photos/test_red.jpg',
    mimetype='image/jpeg',
    bytes=33269,
    width=1920,
    height=1080,
    file_modified_at=timezone.now(),
)
photo1.thumbnailed_version = 1
photo1.save()

# Add Car tag with bounding box (center-left area)
PhotoTag.objects.create(
    photo=photo1,
    tag=car_tag,
    source='C',
    confidence=0.95,
    significance=1.0,
    verified=True,
    position_x=0.3,
    position_y=0.5,
    size_x=0.2,
    size_y=0.3,
)

# Add Truck tag with bounding box (center-right area)
PhotoTag.objects.create(
    photo=photo1,
    tag=truck_tag,
    source='C',
    confidence=0.85,
    significance=0.8,
    verified=False,
    position_x=0.7,
    position_y=0.5,
    size_x=0.25,
    size_y=0.35,
)

# Photo 2: Without bounding boxes (green test image) - OLDER
photo2 = Photo.objects.create(
    library=library,
    taken_at=now - timedelta(hours=1),
    star_rating=2,
    flash=False,
    metering_mode='',
    drive_mode='',
    shooting_mode='',
)
PhotoFile.objects.create(
    photo=photo2,
    path='/data/photos/test_green.jpg',
    mimetype='image/jpeg',
    bytes=33269,
    width=1920,
    height=1080,
    file_modified_at=timezone.now(),
)
photo2.thumbnailed_version = 1
photo2.save()

print(f'{photo1.id},{photo2.id}')
`)

  const ids = result.trim().split(',')
  return { withBoxes: ids[0], withoutBoxes: ids[1] }
}

// Helper to clean up test photos
function cleanupTestPhotosWithBoxes(username: string) {
  runDjangoCommand(`
from photonix.photos.models import Photo, PhotoFile, LibraryUser, Tag, PhotoTag
from photonix.accounts.models import User

try:
    user = User.objects.get(username='${username}')
    library = LibraryUser.objects.filter(user=user).first()
    if library:
        PhotoTag.objects.filter(photo__library=library.library).delete()
        PhotoFile.objects.filter(photo__library=library.library).delete()
        Photo.objects.filter(library=library.library).delete()
        Tag.objects.filter(library=library.library, name__in=['Car', 'Truck']).delete()
except User.DoesNotExist:
    pass
`)
}

test.describe.serial('Bounding Boxes', () => {
  test.beforeAll(async () => {
    setupTestUser()
    const ids = createPhotosWithBoundingBoxes(TEST_USER.username)
    photoWithBoxesId = ids.withBoxes
    photoWithoutBoxesId = ids.withoutBoxes
  })

  test.afterAll(async () => {
    cleanupTestPhotosWithBoxes(TEST_USER.username)
    cleanupTestUser()
  })

  test.beforeEach(async ({ context }) => {
    await context.clearCookies()
  })

  test('displays bounding boxes on photo with object tags', async ({ page }) => {
    await login(page)

    // Navigate to photo with bounding boxes
    await page.goto(`/photo/${photoWithBoxesId}`)

    // Wait for carousel to be visible
    const carousel = page.getByTestId('photo-carousel')
    await expect(carousel).toBeVisible({ timeout: 10000 })

    // Wait for image to load
    await page.waitForTimeout(1000)

    // Check that bounding box labels are visible
    // Object boxes show tag names like "Car", "Truck"
    const carLabel = page.locator('text=Car')
    const truckLabel = page.locator('text=Truck')

    await expect(carLabel).toBeVisible({ timeout: 5000 })
    await expect(truckLabel).toBeVisible({ timeout: 5000 })
  })

  test('hides bounding boxes when navigating to photo without tags', async ({ page }) => {
    await login(page)

    // Go through thumbnails first to populate the photo list store
    const grid = page.getByTestId('thumbnails-grid')
    await expect(grid).toBeVisible({ timeout: 10000 })

    // Click on photo with boxes
    const thumbnail = page.getByTestId(`thumbnail-${photoWithBoxesId}`)
    await expect(thumbnail).toBeVisible({ timeout: 10000 })
    await thumbnail.click()

    await expect(page).toHaveURL(`/photo/${photoWithBoxesId}`, { timeout: 10000 })

    const carousel = page.getByTestId('photo-carousel')
    await expect(carousel).toBeVisible({ timeout: 10000 })

    // Verify boxes are visible initially
    const carLabel = page.locator('text=Car')
    await expect(carLabel).toBeVisible({ timeout: 5000 })

    // Navigate to next photo (should be the one without boxes)
    await page.keyboard.press('ArrowRight')

    // Wait for URL to change
    await page.waitForFunction(
      (originalId) => !window.location.href.includes(originalId),
      photoWithBoxesId,
      { timeout: 5000 }
    )

    // Wait for data fetch
    await page.waitForTimeout(1500)

    // Bounding boxes should NOT be visible on new photo
    await expect(carLabel).not.toBeVisible({ timeout: 3000 })
  })

  test('shows bounding boxes again when navigating back', async ({ page }) => {
    await login(page)

    // Go through thumbnails first to populate the photo list store
    const grid = page.getByTestId('thumbnails-grid')
    await expect(grid).toBeVisible({ timeout: 10000 })

    // Click on photo with boxes
    const thumbnail = page.getByTestId(`thumbnail-${photoWithBoxesId}`)
    await expect(thumbnail).toBeVisible({ timeout: 10000 })
    await thumbnail.click()

    await expect(page).toHaveURL(`/photo/${photoWithBoxesId}`, { timeout: 10000 })

    const carousel = page.getByTestId('photo-carousel')
    await expect(carousel).toBeVisible({ timeout: 10000 })

    // Verify boxes are visible initially
    const carLabel = page.locator('text=Car')
    await expect(carLabel).toBeVisible({ timeout: 5000 })

    // Navigate away
    await page.keyboard.press('ArrowRight')
    await page.waitForFunction(
      (originalId) => !window.location.href.includes(originalId),
      photoWithBoxesId,
      { timeout: 5000 }
    )

    // Wait for data to load
    await page.waitForTimeout(1500)

    // Boxes should be gone
    await expect(carLabel).not.toBeVisible({ timeout: 3000 })

    // Navigate back
    await page.keyboard.press('ArrowLeft')

    // Wait for URL to return to original photo
    await page.waitForFunction(
      (originalId) => window.location.href.includes(originalId),
      photoWithBoxesId,
      { timeout: 5000 }
    )

    // Wait for data to load
    await page.waitForTimeout(1500)

    // Boxes should reappear
    await expect(carLabel).toBeVisible({ timeout: 5000 })
  })

  test('sidebar updates when navigating between photos', async ({ page }) => {
    await login(page)

    // Go through thumbnails first to populate the photo list store
    const grid = page.getByTestId('thumbnails-grid')
    await expect(grid).toBeVisible({ timeout: 10000 })

    // Click on photo with boxes
    const thumbnail = page.getByTestId(`thumbnail-${photoWithBoxesId}`)
    await expect(thumbnail).toBeVisible({ timeout: 10000 })
    await thumbnail.click()

    await expect(page).toHaveURL(`/photo/${photoWithBoxesId}`, { timeout: 10000 })

    const carousel = page.getByTestId('photo-carousel')
    await expect(carousel).toBeVisible({ timeout: 10000 })

    // Open sidebar
    await page.keyboard.press('i')

    // Wait for sidebar to appear
    const ratingHeading = page.locator('text=Rating')
    await expect(ratingHeading).toBeVisible({ timeout: 3000 })

    // Count filled stars (photo 1 has star_rating=3)
    // Star widget uses img elements - filled stars have different styling
    const ratingWidget = page.locator('[class*="cursor-pointer"]').first()
    await expect(ratingWidget).toBeVisible({ timeout: 3000 })

    // Verify Objects section shows Car and Truck
    const objectsHeading = page.locator('text=Objects')
    await expect(objectsHeading).toBeVisible({ timeout: 3000 })

    // The sidebar should show Car and Truck in the objects list
    const sidebarCarItem = page.locator('li:has-text("Car")')
    const sidebarTruckItem = page.locator('li:has-text("Truck")')
    await expect(sidebarCarItem).toBeVisible({ timeout: 3000 })
    await expect(sidebarTruckItem).toBeVisible({ timeout: 3000 })

    // Navigate to next photo
    await page.keyboard.press('ArrowRight')

    // Wait for URL to change
    await page.waitForFunction(
      (originalId) => !window.location.href.includes(originalId),
      photoWithBoxesId,
      { timeout: 5000 }
    )

    // Wait for data fetch
    await page.waitForTimeout(2000)

    // Objects section should no longer show Car/Truck (photo 2 has no object tags)
    // Either the Objects section is gone, or it doesn't contain Car/Truck
    await expect(sidebarCarItem).not.toBeVisible({ timeout: 3000 })
    await expect(sidebarTruckItem).not.toBeVisible({ timeout: 3000 })
  })

  test('no image flash when navigating between photos', async ({ page }) => {
    await login(page)

    // Go to thumbnails first to populate the photo list store
    const grid = page.getByTestId('thumbnails-grid')
    await expect(grid).toBeVisible({ timeout: 10000 })

    // Click on photo with boxes
    const thumbnail = page.getByTestId(`thumbnail-${photoWithBoxesId}`)
    await expect(thumbnail).toBeVisible({ timeout: 10000 })
    await thumbnail.click()

    await expect(page).toHaveURL(`/photo/${photoWithBoxesId}`, { timeout: 10000 })

    const carousel = page.getByTestId('photo-carousel')
    await expect(carousel).toBeVisible({ timeout: 10000 })

    // Wait for images to load in carousel
    await page.waitForFunction(
      () => {
        const viewers = document.querySelectorAll('[data-testid="photo-viewer"]')
        if (viewers.length < 2) return false
        for (const viewer of viewers) {
          const img = viewer.querySelector('img')
          if (img && !img.complete) return false
        }
        return true
      },
      { timeout: 15000 }
    )

    // Set up observer to detect if any images get removed/re-added (flash)
    await page.evaluate(() => {
      (window as unknown as { __imageFlashDetected: boolean }).__imageFlashDetected = false
      const viewers = document.querySelectorAll('[data-testid="photo-viewer"]')
      for (const viewer of viewers) {
        const img = viewer.querySelector('img')
        if (img) {
          // If the src changes or image is removed, mark as flash
          const originalSrc = img.src
          const observer = new MutationObserver(() => {
            if (img.src !== originalSrc || !img.parentElement) {
              (window as unknown as { __imageFlashDetected: boolean }).__imageFlashDetected = true
            }
          })
          observer.observe(viewer, { childList: true, subtree: true })
        }
      }
    })

    // Navigate to next photo
    await page.keyboard.press('ArrowRight')

    // Wait for navigation
    await page.waitForFunction(
      (originalId) => !window.location.href.includes(originalId),
      photoWithBoxesId,
      { timeout: 5000 }
    )

    // Give time for any flash to occur
    await page.waitForTimeout(500)

    // Check if flash was detected
    const flashDetected = await page.evaluate(
      () => (window as unknown as { __imageFlashDetected: boolean }).__imageFlashDetected
    )

    // Images should NOT flash during navigation
    expect(flashDetected).toBe(false)
  })

  test('scroll navigation updates bounding boxes correctly', async ({ page }) => {
    await login(page)

    // Go through thumbnails first to populate the photo list store
    const grid = page.getByTestId('thumbnails-grid')
    await expect(grid).toBeVisible({ timeout: 10000 })

    // Click on photo with boxes
    const thumbnail = page.getByTestId(`thumbnail-${photoWithBoxesId}`)
    await expect(thumbnail).toBeVisible({ timeout: 10000 })
    await thumbnail.click()

    await expect(page).toHaveURL(`/photo/${photoWithBoxesId}`, { timeout: 10000 })

    const carousel = page.getByTestId('photo-carousel')
    await expect(carousel).toBeVisible({ timeout: 10000 })

    // Verify boxes are visible initially
    const carLabel = page.locator('text=Car')
    await expect(carLabel).toBeVisible({ timeout: 5000 })

    // Simulate swipe by scrolling carousel (tests same code path as touch swipe)
    await page.evaluate(() => {
      const carousel = document.querySelector('[data-testid="photo-carousel"]')
      if (carousel) {
        carousel.scrollBy({ left: carousel.clientWidth, behavior: 'smooth' })
      }
    })

    // Wait for URL to change (swipe navigated to next photo)
    await page.waitForFunction(
      (originalId) => !window.location.href.includes(originalId),
      photoWithBoxesId,
      { timeout: 5000 }
    )

    // Wait for data fetch
    await page.waitForTimeout(1500)

    // Bounding boxes should NOT be visible on new photo (has no tags)
    await expect(carLabel).not.toBeVisible({ timeout: 3000 })

    // Swipe right to go back (scroll left)
    await page.evaluate(() => {
      const carousel = document.querySelector('[data-testid="photo-carousel"]')
      if (carousel) {
        carousel.scrollBy({ left: -carousel.clientWidth, behavior: 'smooth' })
      }
    })

    // Wait for URL to return to original photo
    await page.waitForFunction(
      (originalId) => window.location.href.includes(originalId),
      photoWithBoxesId,
      { timeout: 5000 }
    )

    // Wait for data fetch
    await page.waitForTimeout(1500)

    // Boxes should reappear
    await expect(carLabel).toBeVisible({ timeout: 5000 })
  })

  test('bounding boxes toggle visibility with keyboard shortcut', async ({ page }) => {
    await login(page)

    // Navigate to photo with bounding boxes
    await page.goto(`/photo/${photoWithBoxesId}`)

    const carousel = page.getByTestId('photo-carousel')
    await expect(carousel).toBeVisible({ timeout: 10000 })

    // Wait for image to load
    await page.waitForTimeout(1000)

    // Verify boxes are visible initially (default is on)
    // Use specific locator targeting bounding box overlay (has red border/bg classes)
    // This avoids matching the sidebar list items
    const boundingBoxLabel = page.locator('[class*="border-red-500"]', { hasText: 'Car' })
    await expect(boundingBoxLabel).toBeVisible({ timeout: 5000 })

    // Open sidebar to access bounding box toggle
    await page.keyboard.press('i')

    // Wait for sidebar to fully render
    const ratingHeading = page.locator('text=Rating')
    await expect(ratingHeading).toBeVisible({ timeout: 5000 })

    // Find and click the "Hide bounding boxes" button (uses title attribute as accessible name)
    const hideButton = page.getByRole('button', { name: 'Hide bounding boxes' })
    await expect(hideButton).toBeVisible({ timeout: 5000 })
    await hideButton.click()

    // Boxes should now be hidden (overlay gone, but sidebar still shows "Car" in list)
    await expect(boundingBoxLabel).not.toBeVisible({ timeout: 3000 })

    // Find and click "Show bounding boxes" button
    const showButton = page.getByRole('button', { name: 'Show bounding boxes' })
    await expect(showButton).toBeVisible({ timeout: 5000 })
    await showButton.click()

    // Boxes should be visible again
    await expect(boundingBoxLabel).toBeVisible({ timeout: 3000 })
  })
})
