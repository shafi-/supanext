import { test, expect } from '@playwright/test'

const TEST_EMAIL = `dash-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
const TEST_PASSWORD = 'DashPassword123!'

test.describe('Dashboard', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await page.goto('/auth/register/')
    await page.locator('#fullName').fill('Dashboard Test User')
    await page.locator('#email').fill(TEST_EMAIL)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.locator('#confirmPassword').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Create Account' }).click()
    // Allow either dashboard (success) or register page (user exists from parallel run)
    try {
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
    } catch {
      // User may already exist from parallel worker - acceptable
    }
    await page.close()
  })

  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard/')
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 })
  })

  test('displays dashboard content when authenticated', async ({ page }) => {
    await page.goto('/auth/login/')
    await page.locator('#email').fill(TEST_EMAIL)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    await expect(page.locator('h1')).toContainText('Dashboard')
    await expect(page.locator(`text=Welcome back, ${TEST_EMAIL}!`)).toBeVisible()
  })

  test('shows navigation links', async ({ page }) => {
    await page.goto('/auth/login/')
    await page.locator('#email').fill(TEST_EMAIL)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    await expect(page.locator('nav').getByText('Dashboard')).toBeVisible()
    await expect(page.locator('nav').getByText('Profile')).toBeVisible()
    await expect(page.locator('nav').getByText('Sign Out')).toBeVisible()
  })

  test('shows card sections', async ({ page }) => {
    await page.goto('/auth/login/')
    await page.locator('#email').fill(TEST_EMAIL)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    await expect(page.getByRole('heading', { name: 'My Organizations' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Profile Settings' })).toBeVisible()
  })

  test('shows quick stats section', async ({ page }) => {
    await page.goto('/auth/login/')
    await page.locator('#email').fill(TEST_EMAIL)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    await expect(page.getByRole('heading', { name: 'Quick Stats' })).toBeVisible()
  })

  test('Profile link navigates to profile page', async ({ page }) => {
    await page.goto('/auth/login/')
    await page.locator('#email').fill(TEST_EMAIL)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    await page.locator('nav').getByText('Profile').click()
    await expect(page).toHaveURL(/\/profile/)
  })

  test('can sign out from dashboard', async ({ page }) => {
    await page.goto('/auth/login/')
    await page.locator('#email').fill(TEST_EMAIL)
    await page.locator('#password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    await page.getByRole('button', { name: 'Sign Out' }).click()
    await expect(page).toHaveURL(/\/auth\/login\//, { timeout: 10000 })
  })
})
