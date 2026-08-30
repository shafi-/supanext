import { test, expect } from '@playwright/test'
import { execSync } from 'child_process'

const ADMIN_PASSWORD = 'AdminPassword123!'
const ADMIN_EMAIL = `sub-admin-${Date.now()}@example.com`
const SERVICE_KEY = execSync('supabase status 2>&1 | grep "Secret key" | sed "s/.*: //"').toString().trim()

async function createSystemAdmin(page: import('@playwright/test').Page) {
  // Register user
  await page.goto('/auth/register/')
  await page.locator('#fullName').fill('Subscription Admin')
  await page.locator('#email').fill(ADMIN_EMAIL)
  await page.locator('#password').fill(ADMIN_PASSWORD)
  await page.locator('#confirmPassword').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Create Account' }).click()
  await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 15000 })

  // Get user ID from auth token
  const userId = await page.evaluate(() => {
    const key = Object.keys(localStorage).find(k => k.endsWith('-auth-token'))
    if (!key) throw new Error('No auth token key found')
    const stored = localStorage.getItem(key)
    if (!stored) throw new Error('No auth token stored')
    return JSON.parse(stored).user?.id
  })

  if (!userId) throw new Error('Could not extract user ID')

  // Set is_system_admin via set_system_admin RPC with service key
  const result = await page.evaluate(async ({ userId, SERVICE_KEY }) => {
    const res = await fetch('http://localhost:54321/rest/v1/rpc/set_system_admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Profile': 'api',
        'Accept-Profile': 'api',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
      },
      body: JSON.stringify({ p_user_id: userId }),
    })
    return { ok: res.ok, status: res.status, body: await res.text() }
  }, { userId, SERVICE_KEY })

  if (!result.ok) {
    throw new Error(`set_system_admin failed (${result.status}): ${result.body}`)
  }

  // Reload to pick up the change
  await page.reload()
  await page.waitForURL(/\/app\/dashboard/)
}

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/auth/login/')
  await page.locator('#email').fill(ADMIN_EMAIL)
  await page.locator('#password').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 15000 })
}

test.describe.serial('Subscription Management', () => {
  test('register and setup system admin', async ({ page }) => {
    await createSystemAdmin(page)
  })

  test('admin page shows Subscription Plans link', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/', { waitUntil: 'networkidle' })
    await expect(page.getByRole('link', { name: 'Subscription Plans' })).toBeVisible({ timeout: 10000 })
  })

  test('Subscription Plans link navigates to plans page', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/', { waitUntil: 'networkidle' })
    await page.getByRole('link', { name: 'Subscription Plans' }).click()
    await expect(page).toHaveURL(/\/admin\/plans/)
  })

  test('plans page loads with table', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/plans/', { waitUntil: 'networkidle' })
    await expect(page.locator('h1:has-text("Subscription Plans")')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('th:has-text("Name")')).toBeVisible()
    await expect(page.locator('th:has-text("Monthly")')).toBeVisible()
    await expect(page.locator('th:has-text("Yearly")')).toBeVisible()
    await expect(page.locator('th:has-text("Features")')).toBeVisible()
  })

  test('plans page shows Create Plan button', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/plans/', { waitUntil: 'networkidle' })
    await expect(page.getByRole('button', { name: 'Create Plan' })).toBeVisible({ timeout: 10000 })
  })

  test('plans page shows seed plans', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/plans/', { waitUntil: 'networkidle' })
    await expect(page.locator('td:has-text("Free")')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('td:has-text("Pro")')).toBeVisible()
    await expect(page.locator('td:has-text("Enterprise")')).toBeVisible()
  })

  test('Create Plan opens form', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/plans/', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Create Plan' }).click()
    await expect(page.locator('h2:has-text("Create Plan")')).toBeVisible()
  })

  test('admin page shows Organization Subscriptions link', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/', { waitUntil: 'networkidle' })
    await expect(page.getByRole('link', { name: 'Organization Subscriptions' })).toBeVisible({ timeout: 10000 })
  })

  test('Organization Subscriptions link navigates to subscriptions page', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/', { waitUntil: 'networkidle' })
    await page.getByRole('link', { name: 'Organization Subscriptions' }).click()
    await expect(page).toHaveURL(/\/admin\/subscriptions/)
  })

  test('subscriptions page loads', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/subscriptions/', { waitUntil: 'networkidle' })
    await expect(page.locator('h1:has-text("Organization Subscriptions")')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('th:has-text("Organization")')).toBeVisible()
    await expect(page.locator('th:has-text("Plan")')).toBeVisible()
    await expect(page.locator('th:has-text("Status")')).toBeVisible()
  })

  test('subscriptions page shows empty state', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/subscriptions/', { waitUntil: 'networkidle' })
    await expect(page.locator('text=No subscriptions yet')).toBeVisible({ timeout: 10000 })
  })
})
