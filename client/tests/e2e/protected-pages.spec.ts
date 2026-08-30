import { test, expect } from '@playwright/test'

const TEST_EMAIL = `protected-${crypto.randomUUID()}@example.com`
const TEST_PASSWORD = 'ProtectedPass123!'

async function registerOrLogin(page: import('@playwright/test').Page) {
  await page.goto('/auth/register/')
  await page.locator('#fullName').fill('Protected Test User')
  await page.locator('#email').fill(TEST_EMAIL)
  await page.locator('#password').fill(TEST_PASSWORD)
  await page.locator('#confirmPassword').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: 'Create Account' }).click()
  try {
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10000 })
  } catch {
    await page.goto('/auth/login/')
    await page.locator('#email').fill(TEST_EMAIL)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10000 })
  }
}

test.describe('Protected Pages', () => {
  test.describe('Profile Page', () => {
    test('redirects to login when not authenticated', async ({ page }) => {
      await page.goto('/app/profile/')
      await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 })
    })

    test('displays user email when authenticated', async ({ page }) => {
      await registerOrLogin(page)

      await page.goto('/app/profile/')
      await expect(page.locator('h1')).toContainText('Profile')
      await expect(page.getByRole('paragraph').filter({ hasText: TEST_EMAIL })).toBeVisible()
    })
  })

  test.describe('Dashboard Page', () => {
    test('redirects to login when not authenticated', async ({ page }) => {
      await page.goto('/app/dashboard/')
      await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 })
    })

    test('loads dashboard when authenticated', async ({ page }) => {
      await registerOrLogin(page)

      await page.goto('/app/dashboard/')
      await expect(page.locator('h1')).toContainText('Dashboard')
    })
  })

  test.describe('Invite Page', () => {
    test('loads with invalid token shows error', async ({ page }) => {
      await page.goto('/invite/?token=invalidtoken')
      await expect(page.getByRole('heading', { name: 'Invalid Invite' })).toBeVisible({ timeout: 10000 })
    })

    test('loads with empty token', async ({ page }) => {
      await page.goto('/invite/')
      await expect(page.locator('body')).toBeVisible()
    })
  })
})
