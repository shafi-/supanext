import { test, expect } from '@playwright/test'
import { execSync } from 'child_process'

/**
 * GOLDEN PATH E2E — full stack through the real browser:
 *   identities seeded via GoTrue REST → sessions injected into localStorage
 *   → request org (UI) → ops approve → subscribe → invite → anonymous preview
 *   → accept as member → entitlement-gated campaigns CRUD.
 *
 * Login-form mechanics are intentionally out of scope here (covered manually);
 * these tests assert application behaviour for authenticated users.
 *
 * Prerequisites: supabase db reset && supabase start && pnpm build.
 */

const API = 'http://127.0.0.1:54321'
const APP = 'http://localhost:3000'
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
const STORAGE_KEY = 'sb-localhost-auth-token' // supabase-js ref = hostname first label
const TS = Date.now()
const ADMIN = { email: `e2e-a-${TS}@t.io`, pass: 's3cretpass123', id: '' }
const MEMBER = { email: `e2e-m-${TS}@t.io`, pass: 's3cretpass123', id: '' }
const ORG_NAME = `E2E Org ${TS}`
const SLUG = `e2e${TS}`

type Session = {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at?: number
  token_type: string
  user: unknown
}

function psql(sql: string): string {
  return execSync(
    `docker exec -i supabase_db_supanext psql -U postgres -d postgres -Atc "${sql.replace(/"/g, '\\"')}"`
  )
    .toString()
    .trim()
}

async function apiSignup(email: string, password: string) {
  const res = await fetch(`${API}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  expect(res.ok, `signup ${email}`).toBeTruthy()
}

async function apiLogin(email: string, password: string): Promise<Session> {
  const res = await fetch(`${API}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  expect(res.ok, `login ${email}`).toBeTruthy()
  return (await res.json()) as Session
}

async function restRpc<T = unknown>(fn: string, jwt: string, data?: unknown): Promise<T> {
  const res = await fetch(`${API}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${jwt}`,
      'Content-Profile': 'api',
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
  })
  const text = await res.text()
  expect(res.ok, `${fn}: ${text}`).toBeTruthy()
  return text ? (JSON.parse(text) as T) : (null as T)
}

/** Injects a supabase-js session into localStorage before any app script runs. */
function useSession(page: import('@playwright/test').Page, session: Session) {
  page.addInitScript(
    ([k, v]) => {
      window.localStorage.setItem(k!, v!)
    },
    [STORAGE_KEY, JSON.stringify(session)]
  )
}

let adminSession: Session
let memberSession: Session

test.describe.configure({ mode: 'serial' })

test('seed: identities, sysadmin bootstrap (idempotent), sessions', async () => {
  await apiSignup(ADMIN.email, ADMIN.pass)
  await apiSignup(MEMBER.email, MEMBER.pass)
  ADMIN.id = psql(`select id::text from auth.users where email='${ADMIN.email}'`)

  const existing = psql(
    `select coalesce((select user_id::text from app.system_admins order by user_id limit 1),'')`
  )
  if (!existing) {
    execSync(
      `docker exec -i supabase_db_supanext psql -U postgres -d postgres -c "select set_config('request.jwt.claims','{\\"sub\\":\\"${ADMIN.id}\\",\\"role\\":\\"authenticated\\"}',true); select api.bootstrap_system_admin();"`
    )
  } else {
    execSync(
      `docker exec -i supabase_db_supanext psql -U postgres -d postgres -c "begin; insert into auth.users (id,aud,role,email,encrypted_password,email_confirmed_at) values ('${ADMIN.id}','authenticated','authenticated','${ADMIN.email}','x',now()) on conflict (id) do nothing; select set_config('request.jwt.claims','{\\"sub\\":\\"${existing}\\",\\"role\\":\\"authenticated\\"}',true); select api.grant_system_admin('${ADMIN.id}'::uuid); commit;"`
    )
  }

  adminSession = await apiLogin(ADMIN.email, ADMIN.pass)
  memberSession = await apiLogin(MEMBER.email, MEMBER.pass)
  const ctx = await restRpc<{ is_system_admin: boolean }>(
    'get_session_context',
    adminSession.access_token
  )
  expect(ctx.is_system_admin).toBe(true)
})

test('org request via UI lands as pending', async ({ page }) => {
  useSession(page, adminSession)
  await page.goto('/orgs')
  await page.fill('input[placeholder="Organization name"]', ORG_NAME)
  await page.fill('input[placeholder="slug"]', SLUG)
  await page.click('button:has-text("Create")')
  const card = page.locator('a', { hasText: ORG_NAME })
  await expect(card).toBeVisible({ timeout: 10000 })
  await expect(card.locator('span.rounded-full', { hasText: 'pending' })).toBeVisible()
})

test('ops approve + subscribe → UI shows active', async ({ page }) => {
  const orgId = psql(`select id::text from app.organizations where slug='${SLUG}'`)
  psql(`select set_config('request.jwt.claims','{"sub":"${ADMIN.id}","role":"authenticated"}',true); select api.approve_organization('${orgId}');`)
  const planId = JSON.parse(psql(`select coalesce(jsonb_agg(id::text),'[]') from app.subscription_plans where code='basic'`))[0]
  await restRpc('assign_subscription', adminSession.access_token, {
    p_org_id: orgId,
    p_plan_id: planId,
    p_status: 'active',
    p_starts_at: new Date().toISOString(),
  })

  useSession(page, adminSession)
  await page.goto(`/orgs?id=${orgId}`)
  await expect(page.locator('span.rounded-full', { hasText: 'active' }).first()).toBeVisible({
    timeout: 10000,
  })
})

test('invitation minted; anonymous preview is warm', async ({ page }) => {
  const orgId = psql(`select id::text from app.organizations where slug='${SLUG}'`)
  useSession(page, adminSession)
  await page.goto(`/orgs?id=${orgId}`)
  await page.click('button:has-text("Invitations")')
  await page.fill('input[type="email"]', MEMBER.email)
  await page.click('button:has-text("Invite")')
  const code = page.locator('code')
  await expect(code).toContainText('/invite?token=', { timeout: 10000 })
  globalThis.__inviteLink = (await code.textContent())!.trim()

  // anonymous preview — genuinely fresh context (no injected storage)
  const browser = page.context().browser()
  const anonContext = await browser!.newContext()
  const anon = await anonContext.newPage()
  await anon.goto(globalThis.__inviteLink!)
  const storageDump = await anon.evaluate(() =>
    JSON.stringify({ ls: Object.fromEntries(Object.entries(localStorage)) })
  )
  console.log('anon-storage:', storageDump)
  console.log('anon-url:', anon.url())
  console.log('invite-link:', globalThis.__inviteLink)
  await anon.screenshot({ path: '.temp/anon-invite.png' })
  await expect(anon.getByText(/invited/i)).toBeVisible({ timeout: 10000 })
  await expect(anon.getByRole('main').getByRole('link', { name: /sign in/i })).toBeVisible()
  await anonContext.close()
})

test('member accepts invitation through the UI', async ({ page }) => {
  useSession(page, memberSession)
  await page.goto(globalThis.__inviteLink!)
  await page.click('button:has-text("Accept Invitation")')
  await page.waitForURL('**/orgs**', { timeout: 15000 })
})

test('entitlement-gated campaigns CRUD works for subscribed org', async ({ page }) => {
  const orgId = psql(`select id::text from app.organizations where slug='${SLUG}'`)
  useSession(page, adminSession)
  await page.goto(`/orgs?id=${orgId}`)
  await expect(page.getByRole('button', { name: 'Campaigns' })).toBeVisible()
  await page.click('button:has-text("Campaigns")')
  await page.click('button:has-text("New Campaign")')
  await page.fill('input[placeholder="Campaign name"]', `Food Drive ${TS}`)
  await page.click('form button:has-text("Create")')
  await expect(page.getByText(`Food Drive ${TS}`)).toBeVisible({ timeout: 10000 })
})

declare global {
  // eslint-disable-next-line no-var
  var __inviteLink: string | undefined
}
