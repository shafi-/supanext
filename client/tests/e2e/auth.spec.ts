import { test, expect } from '@playwright/test'

const TEST_EMAIL = `test-${Date.now()}@example.com`
const TEST_PASSWORD = 'TestPassword123!'

test.describe('Auth Flow', () => {
  test.describe('Register Page', () => {
    test('loads with correct form fields', async ({ page }) => {
      await page.goto('/auth/register/')
      await expect(page.locator('h1')).toContainText('Create Account')
      await expect(page.locator('text=Join SupaNext today')).toBeVisible()
      await expect(page.locator('#fullName')).toBeVisible()
      await expect(page.locator('#email')).toBeVisible()
      await expect(page.locator('#password')).toBeVisible()
      await expect(page.locator('#confirmPassword')).toBeVisible()
    })

    test('shows error when passwords do not match', async ({ page }) => {
      await page.goto('/auth/register/')
      await page.locator('#email').fill('test@example.com')
      await page.locator('#password').fill('password123')
      await page.locator('#confirmPassword').fill('differentpassword')
      await page.getByRole('button', { name: 'Create Account' }).click()
      await expect(page.locator('text=Passwords do not match')).toBeVisible()
    })

    test('shows error when password is too short', async ({ page }) => {
      await page.goto('/auth/register/')
      await page.locator('#email').fill('test@example.com')
      await page.locator('#password').fill('12345')
      await page.locator('#confirmPassword').fill('12345')
      await page.getByRole('button', { name: 'Create Account' }).click()
      await expect(page.locator('text=Password must be at least 6 characters')).toBeVisible()
    })

    test('has link to login page', async ({ page }) => {
      await page.goto('/auth/register/')
      await page.getByRole('link', { name: 'Sign in' }).click()
      await expect(page).toHaveURL(/\/auth\/login/)
    })

    test('has link back to home', async ({ page }) => {
      await page.goto('/auth/register/')
      await page.getByRole('link', { name: '← Back to home' }).click()
      await expect(page).toHaveURL('/')
    })

    test('can register a new user', async ({ page }) => {
      await page.goto('/auth/register/')
      await page.locator('#fullName').fill('Test User')
      await page.locator('#email').fill(TEST_EMAIL)
      await page.locator('#password').fill(TEST_PASSWORD)
      await page.locator('#confirmPassword').fill(TEST_PASSWORD)
      await page.getByRole('button', { name: 'Create Account' }).click()

      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
    })
  })

  test.describe('Login Page', () => {
    test('loads with correct form fields', async ({ page }) => {
      await page.goto('/auth/login/')
      await expect(page.locator('h1')).toContainText('Sign In')
      await expect(page.locator('text=Welcome back to SupaNext')).toBeVisible()
      await expect(page.locator('#email')).toBeVisible()
      await expect(page.locator('#password')).toBeVisible()
      await expect(page.locator('#remember')).toBeVisible()
    })

    test('shows error with invalid credentials', async ({ page }) => {
      await page.goto('/auth/login/')
      await page.locator('#email').fill('nonexistent@example.com')
      await page.locator('#password').fill('wrongpassword')
      await page.getByRole('button', { name: 'Sign In' }).click()
      await expect(page.locator('[class*="red"]').first()).toBeVisible({ timeout: 10000 })
    })

    test('has link to register page', async ({ page }) => {
      await page.goto('/auth/login/')
      await page.getByRole('link', { name: 'Sign up' }).click()
      await expect(page).toHaveURL(/\/auth\/register/)
    })

    test('has link back to home', async ({ page }) => {
      await page.goto('/auth/login/')
      await page.getByRole('link', { name: '← Back to home' }).click()
      await expect(page).toHaveURL('/')
    })

    test('can login with valid credentials', async ({ page }) => {
      const loginEmail = `login-${Date.now()}@example.com`

      await page.goto('/auth/register/')
      await page.locator('#fullName').fill('Login Test User')
      await page.locator('#email').fill(loginEmail)
      await page.locator('#password').fill(TEST_PASSWORD)
      await page.locator('#confirmPassword').fill(TEST_PASSWORD)
      await page.getByRole('button', { name: 'Create Account' }).click()
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

      await page.getByRole('button', { name: 'Sign Out' }).click()
      await expect(page).toHaveURL(/\/auth\/login\//, { timeout: 10000 })

      await page.locator('#email').fill(loginEmail)
      await page.locator('#password').fill(TEST_PASSWORD)
      await page.getByRole('button', { name: 'Sign In' }).click()
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
    })
  })

  test.describe('Reset Password Page', () => {
    test('loads with email form', async ({ page }) => {
      await page.goto('/auth/reset-password/')
      await expect(page.locator('h1')).toContainText('Reset Password')
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Send reset link' })).toBeVisible()
    })

    test('shows success message after submitting email', async ({ page }) => {
      await page.goto('/auth/reset-password/')
      await page.locator('input[type="email"]').fill('test@example.com')
      await page.getByRole('button', { name: 'Send reset link' }).click()
      await expect(page.locator('text=Check your email')).toBeVisible({ timeout: 10000 })
      await expect(page.locator('text=We sent a password reset link')).toBeVisible()
    })

    test('has link back to login after submit', async ({ page }) => {
      await page.goto('/auth/reset-password/')
      await page.locator('input[type="email"]').fill('test@example.com')
      await page.getByRole('button', { name: 'Send reset link' }).click()
      await expect(page.locator('text=Check your email')).toBeVisible({ timeout: 10000 })
      await page.getByRole('link', { name: 'Back to login' }).click()
      await expect(page).toHaveURL(/\/auth\/login/)
    })
  })
})
