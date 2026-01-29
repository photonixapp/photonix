import { expect, Page } from '@playwright/test'
import { execSync } from 'child_process'

// Default test user credentials
export const TEST_USER = {
  username: 'testuser',
  password: 'testpassword123',
}

// Helper to run Django management commands via Docker
export function runDjangoCommand(pythonCode: string): string {
  const escaped = pythonCode.replace(/"/g, '\\"')
  return execSync(
    `docker compose -f docker/docker-compose.dev.yml exec -T photonix python manage.py shell -c "${escaped}"`,
    { cwd: process.cwd() + '/..', encoding: 'utf-8' }
  )
}

// Helper to create test user with a fully configured library
export function setupTestUser(
  username: string = TEST_USER.username,
  password: string = TEST_USER.password
) {
  runDjangoCommand(`
from photonix.accounts.models import User
from photonix.photos.models import Library, LibraryPath, LibraryUser

# Create or get test user
user, created = User.objects.get_or_create(username='${username}')
user.set_password('${password}')
user.has_set_personal_info = True
user.has_created_library = True
user.has_configured_importing = True
user.has_configured_image_analysis = True
user.save()

# Check if user already has a library
if not LibraryUser.objects.filter(user=user).exists():
    # Create a fully configured library
    library = Library.objects.create(
        name='Test Library',
        setup_stage_completed='Th',  # Fully completed setup
        classification_color_enabled=True,
        classification_style_enabled=True,
        classification_object_enabled=True,
        classification_location_enabled=True,
        classification_face_enabled=True,
    )

    # Create library path (storage)
    LibraryPath.objects.create(
        library=library,
        type='St',  # Store
        backend_type='Lo',  # Local filesystem
        path='/data/photos',
    )

    # Associate user with library
    LibraryUser.objects.create(library=library, user=user, owner=True)
`)
}

// Helper to clean up test user and their libraries
export function cleanupTestUser(username: string = TEST_USER.username) {
  runDjangoCommand(`
from photonix.accounts.models import User
from photonix.photos.models import Library, LibraryPath, LibraryUser

# Get user's libraries before deleting
try:
    user = User.objects.get(username='${username}')
    library_ids = list(LibraryUser.objects.filter(user=user).values_list('library_id', flat=True))

    # Delete library associations
    LibraryUser.objects.filter(user=user).delete()

    # Delete library paths
    LibraryPath.objects.filter(library_id__in=library_ids).delete()

    # Delete libraries (only ones owned solely by this test user)
    Library.objects.filter(id__in=library_ids).delete()

    # Delete user
    user.delete()
except User.DoesNotExist:
    pass
`)
}

// Helper to login - waits for form stability before filling
export async function login(
  page: Page,
  username: string = TEST_USER.username,
  password: string = TEST_USER.password
) {
  await page.goto('/login')

  // Wait for React to hydrate - look for username input or onboarding redirect
  // The page might redirect to onboarding if setup isn't complete
  const usernameInput = page.getByTestId('username-input')

  // Wait for either login form or onboarding page
  await page.waitForFunction(
    () => {
      return (
        document.querySelector('[data-testid="username-input"]') !== null ||
        document.querySelector('h1')?.textContent?.includes('Onboarding') ||
        document.querySelector('h1')?.textContent?.includes('Welcome')
      )
    },
    { timeout: 30000 }
  )

  // If we got redirected to onboarding, go back to login
  if (!await usernameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
    console.log('Redirected away from login, current URL:', page.url())
    await page.goto('/login')
  }

  await expect(usernameInput).toBeVisible({ timeout: 15000 })
  await expect(usernameInput).toBeEnabled()

  await usernameInput.fill(username)
  await page.getByTestId('password-input').fill(password)
  await page.getByTestId('login-button').click()
  await expect(page).toHaveURL('/', { timeout: 10000 })
}

// Sample test photos available in the repository
export const TEST_PHOTOS = {
  snow: '/home/damian/projects/photonix/tests/photos/snow.jpg',
  tree: '/home/damian/projects/photonix/tests/photos/tree.jpg',
  badDate: '/home/damian/projects/photonix/tests/photos/bad_date.jpg',
  // Solid color test images for carousel/navigation tests
  red: '/data/photos/test_red.jpg',
  green: '/data/photos/test_green.jpg',
  blue: '/data/photos/test_blue.jpg',
  yellow: '/data/photos/test_yellow.jpg',
  cyan: '/data/photos/test_cyan.jpg',
}

// Tag type codes for test photo creation
// L=Location, O=Object, F=Face/Person, C=Color, S=Style, E=Event, G=Generic
export type TagTypeCode = 'L' | 'O' | 'F' | 'C' | 'S' | 'E' | 'G'

export interface TestTag {
  name: string
  type: TagTypeCode
}

export interface CreateTestPhotosOptions {
  tags?: TestTag[]
}

// Color names for test images (maps to solid color test images)
const TEST_IMAGE_COLORS = ['red', 'green', 'blue', 'yellow', 'cyan']

// Helper to create test photos in the database
// Returns array of photo IDs
export function createTestPhotos(
  username: string = TEST_USER.username,
  count: number = 5,
  options: CreateTestPhotosOptions = {}
): string[] {
  const tagsJson = JSON.stringify(options.tags || []).replace(/'/g, "\\'")
  // Limit count to available test images
  const actualCount = Math.min(count, TEST_IMAGE_COLORS.length)
  const colorsJson = JSON.stringify(TEST_IMAGE_COLORS.slice(0, actualCount))

  const result = runDjangoCommand(`
from photonix.photos.models import Photo, PhotoFile, LibraryUser, Tag, PhotoTag
from photonix.accounts.models import User
from django.utils import timezone
import json

user = User.objects.get(username='${username}')
library = LibraryUser.objects.filter(user=user).first().library

# Create tags first
tags_config = json.loads('${tagsJson}')
created_tags = []
for tag_data in tags_config:
    tag, _ = Tag.objects.get_or_create(
        library=library,
        name=tag_data['name'],
        type=tag_data['type'],
        defaults={'source': 'H'}
    )
    created_tags.append(tag)

# Use actual test image files (solid colors)
colors = json.loads('${colorsJson}')
photo_ids = []
for i, color in enumerate(colors):
    photo = Photo.objects.create(
        library=library,
        star_rating=i % 6,
        # EXIF metadata fields (nullable but GraphQL requires values)
        flash=False,
        metering_mode='',
        drive_mode='',
        shooting_mode='',
    )
    PhotoFile.objects.create(
        photo=photo,
        path=f'/data/photos/test_{color}.jpg',
        mimetype='image/jpeg',
        bytes=33269,  # Actual file size
        width=1920,
        height=1080,
        file_modified_at=timezone.now(),
    )
    photo.thumbnailed_version = 1
    photo.save()

    # Add tags to photo
    for tag in created_tags:
        PhotoTag.objects.create(
            photo=photo,
            tag=tag,
            source='H',
            confidence=1.0,
            significance=1.0,
            verified=True
        )

    photo_ids.append(str(photo.id))

print(','.join(photo_ids))
`)

  return result.trim().split(',').filter(Boolean)
}

// Helper to clean up test photos and tags
export function cleanupTestPhotos(username: string = TEST_USER.username) {
  runDjangoCommand(`
from photonix.photos.models import Photo, PhotoFile, LibraryUser, Tag, PhotoTag
from photonix.accounts.models import User

try:
    user = User.objects.get(username='${username}')
    library = LibraryUser.objects.filter(user=user).first()
    if library:
        # Delete photo tags first (foreign key constraint)
        PhotoTag.objects.filter(photo__library=library.library).delete()
        PhotoFile.objects.filter(photo__library=library.library).delete()
        Photo.objects.filter(library=library.library).delete()
        # Delete tags created for this library
        Tag.objects.filter(library=library.library).delete()
except User.DoesNotExist:
    pass
`)
}
