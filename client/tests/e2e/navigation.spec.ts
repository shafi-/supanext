import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test.describe('Public Navigation', () => {
    test('landing page nav has correct links', async ({ page }) => {
      await page.goto('/')
      const nav = page.locator('nav')
      await expect(nav.locator('h1')).toContainText('SupaNext')
      await expect(nav.getByRole('link', { name: 'Sign In' })).toBeVisible()
      await expect(nav.getByRole('link', { name: 'Get Started' })).toBeVisible()
    })

    test('can navigate between auth pages', async ({ page }) => {
      // Login -> Register
      await page.goto('/auth/login/')
      await page.getByRole('link', { name: 'Sign up' }).click()
      await expect(page).toHaveURL(/\/auth\/register/)

      // Register -> Login
      await page.getByRole('link', { name: 'Sign in' }).click()
      await expect(page).toHaveURL(/\/auth\/login/)
    })

    test('can navigate home from auth pages', async ({ page }) => {
      await page.goto('/auth/login/')
      await page.getByRole('link', { name: '← Back to home' }).click()
      await expect(page).toHaveURL('/')

      await page.goto('/auth/register/')
      await page.getByRole('link', { name: '← Back to home' }).click()
      await expect(page).toHaveURL('/')
    })
  })

  test.describe('Static Pages', () => {
    test('about page loads', async ({ page }) => {
      await page.goto('/about/')
      await expect(page.locator('h1')).toContainText('About SupaNext')
      await expect(page.locator('text=NextJS + Supabase starter template')).toBeVisible()
    })

    test('privacy page loads', async ({ page }) => {
      await page.goto('/privacy/')
      await expect(page.locator('h1')).toContainText('Privacy Policy')
    })
  })

  test.describe('404 Handling', () => {
    test('non-existent route shows 404', async ({ page }) => {
      const response = await page.goto('/nonexistent-page/')
      expect(response?.status()).toBe(404)
    })
  })
})
