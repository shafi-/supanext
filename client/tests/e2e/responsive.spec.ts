import { test, expect } from '@playwright/test'

test.describe('Responsive Design', () => {
  test.describe('Mobile Layout', () => {
    test.use({ viewport: { width: 375, height: 812 } })

    test('landing page renders on mobile', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('h1')).toContainText('SupaNext')
      await expect(page.locator('h2')).toContainText('Welcome to SupaNext')
    })

    test('auth pages render on mobile', async ({ page }) => {
      await page.goto('/auth/login/')
      await expect(page.locator('h1')).toContainText('Sign In')
      await expect(page.locator('#email')).toBeVisible()
    })

    test('register page renders on mobile', async ({ page }) => {
      await page.goto('/auth/register/')
      await expect(page.locator('h1')).toContainText('Create Account')
      await expect(page.locator('#email')).toBeVisible()
    })
  })

  test.describe('Desktop Layout', () => {
    test.use({ viewport: { width: 1920, height: 1080 } })

    test('landing page renders on desktop', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('h1')).toContainText('SupaNext')
      const cards = page.locator('.grid > div')
      await expect(cards).toHaveCount(3)
    })

    test('dashboard renders on desktop', async ({ page }) => {
      const testEmail = `desktop-${Date.now()}@example.com`
      const testPassword = 'DesktopPass123!'

      await page.goto('/auth/register/')
      await page.locator('#fullName').fill('Desktop Test User')
      await page.locator('#email').fill(testEmail)
      await page.locator('#password').fill(testPassword)
      await page.locator('#confirmPassword').fill(testPassword)
      await page.getByRole('button', { name: 'Create Account' }).click()
      await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 15000 })

      await expect(page.locator('text=My Organizations')).toBeVisible()
      await expect(page.locator('text=Profile Settings')).toBeVisible()
    })
  })
})
