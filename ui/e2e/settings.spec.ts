import { test, expect, type Page } from '@playwright/test'
import {
  runDjangoCommand,
  setupTestUser,
  cleanupTestUser,
  login,
} from './test-utils'

const SETTINGS_USER = { username: 'settingstest', password: 'testpassword123' }
const ADMIN_USER = { username: 'settingsadmin', password: 'testpassword123' }
const CREATED_USER = 'settingsnewuser'

function cleanupAll() {
  cleanupTestUser(SETTINGS_USER.username)
  cleanupTestUser(ADMIN_USER.username)
  runDjangoCommand(`
from photonix.accounts.models import User
User.objects.filter(username='${CREATED_USER}').delete()
`)
}

// Navigate into settings via the UI rather than page.goto(): a full page load
// straight after login can race the JWT refresh under load and bounce to
// /login (known flake), while SPA navigation keeps the in-memory session.
async function openSettings(page: Page, navTestId?: string) {
  await page.getByTestId('header-menu-button').click()
  await page.getByTestId('settings-menu-item').click()
  await expect(page).toHaveURL('/settings/account', { timeout: 10000 })
  if (navTestId) {
    await page.getByTestId(navTestId).click()
  }
}

test.describe('Settings area', () => {
  test.beforeAll(async () => {
    cleanupAll()
    setupTestUser(SETTINGS_USER.username, SETTINGS_USER.password)
    setupTestUser(ADMIN_USER.username, ADMIN_USER.password)
    runDjangoCommand(`
from photonix.accounts.models import User
User.objects.filter(username='${ADMIN_USER.username}').update(is_staff=True)
`)
  })

  test.afterAll(async () => {
    cleanupAll()
  })

  test.beforeEach(async ({ context }) => {
    await context.clearCookies()
  })

  test('header menu links to settings and has no separate account item', async ({
    page,
  }) => {
    await login(page, SETTINGS_USER.username, SETTINGS_USER.password)

    await page.getByTestId('header-menu-button').click()
    await expect(page.getByTestId('settings-menu-item')).toBeVisible()
    await expect(page.getByTestId('account-menu-item')).toHaveCount(0)
    await expect(page.getByTestId('logged-in-user')).toHaveText(
      SETTINGS_USER.username
    )

    await page.getByTestId('settings-menu-item').click()
    await expect(page).toHaveURL('/settings/account', { timeout: 10000 })
    await expect(page.getByTestId('profile-card')).toBeVisible()
    await expect(page.getByTestId('password-card')).toBeVisible()

    // Back control exits to the app
    await page.getByTestId('settings-back-button').click()
    await expect(page).toHaveURL('/', { timeout: 10000 })
  })

  test('changes password and back again', async ({ page }) => {
    await login(page, SETTINGS_USER.username, SETTINGS_USER.password)
    await openSettings(page)

    const changePassword = async (oldPw: string, newPw: string) => {
      await page.getByTestId('old-password-input').fill(oldPw)
      await page.getByTestId('new-password-input').fill(newPw)
      await page.getByTestId('new-password-confirm-input').fill(newPw)
      await page.getByTestId('account-save').click()
      await expect(page.getByTestId('account-success')).toBeVisible({
        timeout: 10000,
      })
    }

    await changePassword(SETTINGS_USER.password, 'differentpassword1')
    await changePassword('differentpassword1', SETTINGS_USER.password)
  })

  test('edits profile email and it persists', async ({ page }) => {
    await login(page, SETTINGS_USER.username, SETTINGS_USER.password)
    await openSettings(page)

    const emailInput = page.getByTestId('profile-email-input')
    await expect(emailInput).toBeVisible()
    await emailInput.fill('settings-e2e@example.com')
    await page.getByTestId('profile-save').click()
    await expect(page.getByTestId('profile-success')).toBeVisible({
      timeout: 10000,
    })

    await page.reload()
    await expect(page.getByTestId('profile-email-input')).toHaveValue(
      'settings-e2e@example.com',
      { timeout: 10000 }
    )
  })

  test('uploads and removes an avatar', async ({ page }) => {
    await login(page, SETTINGS_USER.username, SETTINGS_USER.password)
    await openSettings(page)

    // 4x4 red PNG (generated with PIL)
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAFElEQVR4nGM8oaHBAANMDEgANwcAOFQBICTvemsAAAAASUVORK5CYII='
    await page.getByTestId('avatar-file-input').setInputFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: Buffer.from(pngBase64, 'base64'),
    })

    // The profile avatar becomes a served image (initials fallback is a span)
    const avatarImage = page.locator('img[data-testid="profile-avatar"]')
    await expect(avatarImage).toBeVisible({ timeout: 15000 })
    await expect(avatarImage).toHaveAttribute('src', /\/avatar\/.+\.jpg\?v=/)

    // Remove it again: falls back to initials
    await page.getByTestId('avatar-remove-button').click()
    await expect(page.locator('img[data-testid="profile-avatar"]')).toHaveCount(
      0,
      { timeout: 10000 }
    )
    await expect(
      page.locator('span[data-testid="profile-avatar"]')
    ).toBeVisible()
  })

  test('window.showSettings() opens the settings area (mobile wrapper hook)', async ({
    page,
  }) => {
    await login(page, SETTINGS_USER.username, SETTINGS_USER.password)
    await page.evaluate(() =>
      (window as { showSettings?: () => void }).showSettings?.()
    )
    await expect(page).toHaveURL('/settings/account', { timeout: 10000 })
  })

  test('renames library and toggles settings that persist', async ({ page }) => {
    await login(page, SETTINGS_USER.username, SETTINGS_USER.password)
    await openSettings(page, 'settings-nav-libraries')

    await page.locator('[data-testid^="library-settings-link-"]').first().click()
    await expect(page.getByTestId('library-general-card')).toBeVisible({
      timeout: 10000,
    })

    // Rename
    await page.getByTestId('library-name-input').fill('Renamed E2E Library')
    await page.getByTestId('library-name-save').click()
    await expect(page.getByTestId('library-general-success')).toBeVisible({
      timeout: 10000,
    })

    // Toggle watch-folder on and color analysis off
    const watchToggle = page.getByTestId('setting-watchPhotos')
    const colorToggle = page.getByTestId('setting-classificationColorEnabled')
    await expect(colorToggle).toHaveAttribute('aria-checked', 'true')
    await watchToggle.click()
    await colorToggle.click()
    await expect(colorToggle).toHaveAttribute('aria-checked', 'false')

    // Persisted across reload
    await page.reload()
    await expect(page.getByTestId('library-name-input')).toHaveValue(
      'Renamed E2E Library',
      { timeout: 10000 }
    )
    await expect(page.getByTestId('setting-watchPhotos')).toHaveAttribute(
      'aria-checked',
      'true'
    )
    await expect(
      page.getByTestId('setting-classificationColorEnabled')
    ).toHaveAttribute('aria-checked', 'false')

    // And actually landed in the database
    const dbState = runDjangoCommand(`
from photonix.photos.models import Library
library = Library.objects.get(name='Renamed E2E Library')
store = library.paths.get(type='St')
print(f'{library.classification_color_enabled},{store.watch_for_changes}')
`)
    expect(dbState.trim()).toBe('False,True')
  })

  test('adds and removes an import path', async ({ page }) => {
    await login(page, SETTINGS_USER.username, SETTINGS_USER.password)
    await openSettings(page, 'settings-nav-libraries')
    await page.locator('[data-testid^="library-settings-link-"]').first().click()
    await expect(page.getByTestId('library-storage-card')).toBeVisible({
      timeout: 10000,
    })

    await page.getByTestId('library-import-path-input').fill('/data/e2e-import')
    await page.getByTestId('library-delete-after-import').click()
    await page.getByTestId('library-storage-save').click()
    await expect(page.getByTestId('library-storage-success')).toBeVisible({
      timeout: 10000,
    })

    const created = runDjangoCommand(`
from photonix.photos.models import LibraryPath
path = LibraryPath.objects.filter(type='Im', path='/data/e2e-import').first()
print(f'{bool(path)},{path.delete_after_import if path else None}')
`)
    expect(created.trim()).toBe('True,True')

    // Empty value removes the import path
    await page.getByTestId('library-import-path-input').fill('')
    await page.getByTestId('library-storage-save').click()
    await expect(page.getByTestId('library-storage-success')).toBeVisible({
      timeout: 10000,
    })
    const removed = runDjangoCommand(`
from photonix.photos.models import LibraryPath
print(LibraryPath.objects.filter(type='Im', path='/data/e2e-import').count())
`)
    expect(removed.trim()).toBe('0')
  })

  test('creates a new library that appears in the switcher', async ({ page }) => {
    await login(page, SETTINGS_USER.username, SETTINGS_USER.password)
    await openSettings(page, 'settings-nav-libraries')

    await page.getByTestId('new-library-button').click()
    await page.getByTestId('new-library-name-input').fill('Second E2E Library')
    await page.getByTestId('new-library-path-input').fill('/data/photos')
    await page.getByTestId('new-library-save').click()

    // Lands on the new library's settings page
    await expect(page.getByTestId('library-name-input')).toHaveValue(
      'Second E2E Library',
      { timeout: 15000 }
    )

    // Shows up in the header library switcher
    await page.getByTestId('settings-back-button').click()
    await expect(page).toHaveURL('/', { timeout: 10000 })
    await page.getByTestId('header-menu-button').click()
    await expect(
      page.locator('[data-testid^="library-name-"]', {
        hasText: 'Second E2E Library',
      })
    ).toBeVisible({ timeout: 10000 })
  })

  test('non-staff users get no Users section', async ({ page }) => {
    await login(page, SETTINGS_USER.username, SETTINGS_USER.password)
    await openSettings(page)
    await expect(page.getByTestId('settings-nav-account')).toBeVisible()
    await expect(page.getByTestId('settings-nav-users')).toHaveCount(0)
  })

  test('staff user manages users', async ({ page }) => {
    await login(page, ADMIN_USER.username, ADMIN_USER.password)
    await openSettings(page, 'settings-nav-users')
    await expect(page.getByTestId('users-card')).toBeVisible({ timeout: 10000 })
    await expect(
      page.getByTestId(`user-row-${ADMIN_USER.username}`)
    ).toBeVisible()

    // Create a user
    await page.getByTestId('add-user-button').click()
    await page.getByTestId('new-user-username-input').fill(CREATED_USER)
    await page.getByTestId('new-user-password-input').fill('longenoughpw1')
    await page.getByTestId('new-user-save').click()
    await expect(page.getByTestId(`user-row-${CREATED_USER}`)).toBeVisible({
      timeout: 10000,
    })

    // Deactivate them
    await page.getByTestId(`user-active-toggle-${CREATED_USER}`).click()
    await expect(
      page
        .getByTestId(`user-row-${CREATED_USER}`)
        .getByText('Deactivated', { exact: true })
    ).toBeVisible({ timeout: 10000 })

    const dbState = runDjangoCommand(`
from photonix.accounts.models import User
user = User.objects.get(username='${CREATED_USER}')
print(f'{user.is_active},{user.has_configured_image_analysis}')
`)
    expect(dbState.trim()).toBe('False,True')
  })

  test('analysis-off notice explains why a classifier cannot be switched on', async ({
    page,
  }) => {
    // The e2e stack doesn't run in stored-results mode, so patch the environment query.
    await page.route('**/graphql', async (route) => {
      const body = route.request().postData() ?? ''
      if (!body.includes('query Environment')) return route.fallback()
      const response = await route.fetch()
      const json = await response.json()
      json.data.environment.analysisDisabled = true
      await route.fulfill({ response, json })
    })
    const mutations: string[] = []
    page.on('request', (request) => {
      const body = request.postData() ?? ''
      if (request.url().endsWith('/graphql') && body.includes('mutation UpdateLibrary')) {
        mutations.push(body)
      }
    })

    await login(page, SETTINGS_USER.username, SETTINGS_USER.password)
    await openSettings(page, 'settings-nav-libraries')
    // The seeded library: 'Test Library', or 'Renamed E2E Library' after the rename test.
    // Not .first(), which could pick 'Second E2E Library' (all classifiers off).
    await page
      .locator('[data-testid^="library-settings-link-"]')
      .filter({ hasText: /^(Test Library|Renamed E2E Library)$/ })
      .click()
    await expect(page.getByTestId('library-analysis-card')).toBeVisible({
      timeout: 10000,
    })

    const notice = page.getByTestId('analysis-disabled-notice')
    await expect(notice).toContainText('Image analysis is switched off on this server')
    await expect(notice).toContainText('CLASSIFICATION_DISABLED=1')

    // Turning one off still works...
    const styleToggle = page.getByTestId('setting-classificationStyleEnabled')
    await expect(styleToggle).toHaveAttribute('aria-checked', 'true')
    await styleToggle.click()
    await expect(styleToggle).toHaveAttribute('aria-checked', 'false')
    await expect.poll(() => mutations.length).toBe(1)

    // ...but turning it back on is refused with a toast and no mutation.
    await styleToggle.click()
    await expect(
      page
        .getByTestId('toast-error')
        .filter({ hasText: 'Image analysis is switched off on this server' })
    ).toBeVisible()
    await expect(styleToggle).toHaveAttribute('aria-checked', 'false')
    await page.waitForTimeout(500)
    expect(mutations).toHaveLength(1)

    // Restore Style so re-runs that reuse the user still start from "on".
    runDjangoCommand(`
from photonix.photos.models import Library
Library.objects.filter(users__user__username='${SETTINGS_USER.username}').exclude(
    name='Second E2E Library'
).update(classification_style_enabled=True)
`)
  })
})
