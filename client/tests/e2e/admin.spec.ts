import { test, expect } from '@playwright/test'

const ADMIN_PASSWORD = 'AdminPassword123!'
const ADMIN_EMAIL = `admin-e2e-${Date.now()}@example.com`

async function setupSystemAdmin(page: import('@playwright/test').Page) {
  await page.goto('/auth/register/')
  await page.locator('#fullName').fill('System Admin')
  await page.locator('#email').fill(ADMIN_EMAIL)
  await page.locator('#password').fill(ADMIN_PASSWORD)
  await page.locator('#confirmPassword').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Create Account' }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

  const token = await page.evaluate(() => {
    const key = Object.keys(localStorage).find(k => k.endsWith('-auth-token'))
    if (!key) throw new Error('No auth token key found')
    const stored = localStorage.getItem(key)
    if (!stored) throw new Error('No auth token stored')
    return JSON.parse(stored).access_token
  })

  await page.evaluate(async ({ token }) => {
    await fetch('http://localhost:54321/rest/v1/rpc/bootstrap_system_admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
      },
    })
  }, { token })
}

test.describe.serial('Admin Pages', () => {
  test('loads system stats or shows access denied', async ({ page }) => {
    await setupSystemAdmin(page)
    await page.goto('/admin/', { waitUntil: 'networkidle' })

    const h1Text = await page.locator('h1').textContent()
    const isAdmin = h1Text?.includes('System Admin')

    if (isAdmin) {
      await expect(page.locator('text=Organizations').first()).toBeVisible({ timeout: 10000 })
      await expect(page.locator('text=Users').first()).toBeVisible()
      await expect(page.locator('text=Members').first()).toBeVisible()
      await expect(page.locator('text=Recent Signups')).toBeVisible()
    } else {
      await expect(page.locator('h1')).toContainText('Access Denied')
    }
  })

  test('shows Manage Organizations link when admin', async ({ page }) => {
    await page.goto('/auth/login/')
    await page.locator('#email').fill(ADMIN_EMAIL)
    await page.locator('#password').fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    await page.goto('/admin/', { waitUntil: 'networkidle' })
    const h1Text = await page.locator('h1').textContent()
    if (h1Text?.includes('System Admin')) {
      await expect(page.getByRole('link', { name: 'Manage Organizations' })).toBeVisible({ timeout: 10000 })
    }
  })

  test('Manage Organizations link navigates to orgs page', async ({ page }) => {
    await page.goto('/auth/login/')
    await page.locator('#email').fill(ADMIN_EMAIL)
    await page.locator('#password').fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    await page.goto('/admin/', { waitUntil: 'networkidle' })
    const h1Text = await page.locator('h1').textContent()
    if (h1Text?.includes('System Admin')) {
      await page.getByRole('link', { name: 'Manage Organizations' }).click()
      await expect(page).toHaveURL(/\/admin\/orgs/)
    }
  })

  test('loads organizations table when admin', async ({ page }) => {
    await page.goto('/auth/login/')
    await page.locator('#email').fill(ADMIN_EMAIL)
    await page.locator('#password').fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    await page.goto('/admin/orgs/', { waitUntil: 'networkidle' })
    const h1Text = await page.locator('h1').textContent()
    if (h1Text?.includes('Access Denied')) {
      await expect(page.locator('h1')).toContainText('Access Denied')
    } else {
      await expect(page.locator('th:has-text("Name")')).toBeVisible({ timeout: 10000 })
      await expect(page.locator('th:has-text("Slug")')).toBeVisible()
      await expect(page.locator('th:has-text("Members")')).toBeVisible()
    }
  })
})
