import { test, expect } from '@playwright/test'

const ANON_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
const API_URL = 'http://localhost:54321'

async function setupOrg(): Promise<string> {
  const email = `puborg-${crypto.randomUUID()}@example.com`
  const password = 'PubOrgPass123!'

  // Register user
  const signupRes = await fetch(`${API_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({ email, password, data: { full_name: 'Public Org User' } }),
  })
  const signupData = await signupRes.json()
  const accessToken = signupData.access_token
  if (!accessToken) throw new Error(`Signup failed: ${JSON.stringify(signupData)}`)

  // Wait for trigger to create org
  await new Promise((r) => setTimeout(r, 500))

  // Get org slug using user's access token
  const orgRes = await fetch(`${API_URL}/rest/v1/rpc/get_my_organizations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify({}),
  })
  const orgs = await orgRes.json()
  if (!orgs || orgs.length === 0) throw new Error(`No orgs found for ${email}`)
  return orgs[0].slug
}

test.describe.serial('Public Org Page', () => {
  let testSlug = ''

  test('setup: create user and org', async () => {
    testSlug = await setupOrg()
    expect(testSlug).toBeTruthy()
  })

  test('public page shows org info by slug', async ({ page }) => {
    await page.goto(`/orgs/public/?slug=${testSlug}`, { waitUntil: 'networkidle' })
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 })
    await expect(page.locator(`text=${testSlug}`)).toBeVisible()
  })

  test('public page shows Sign In and Create Account', async ({ page }) => {
    await page.goto(`/orgs/public/?slug=${testSlug}`, { waitUntil: 'networkidle' })
    await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('link', { name: 'Create Account' })).toBeVisible()
  })

  test('public page shows created date', async ({ page }) => {
    await page.goto(`/orgs/public/?slug=${testSlug}`, { waitUntil: 'networkidle' })
    await expect(page.locator('text=Created')).toBeVisible({ timeout: 10000 })
  })

  test('shows not found for invalid slug', async ({ page }) => {
    await page.goto('/orgs/public/?slug=nonexistent-slug-12345', { waitUntil: 'networkidle' })
    await expect(page.locator('h1:has-text("Organization Not Found")')).toBeVisible({ timeout: 10000 })
  })

  test('shows not found for empty slug', async ({ page }) => {
    await page.goto('/orgs/public/', { waitUntil: 'networkidle' })
    await expect(page.locator('h1:has-text("Organization Not Found")')).toBeVisible({ timeout: 10000 })
  })
})
