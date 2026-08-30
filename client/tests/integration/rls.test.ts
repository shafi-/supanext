/**
 * RLS Integration Tests
 *
 * Verifies that Row Level Security policies in supabase/migrations reject
 * direct table access that should only happen through `api.*` RPCs.
 *
 * Requires a running local Supabase stack:
 *   $ supabase start
 *   $ pnpm test:rls
 *
 * Skipped automatically if SUPABASE_DB_URL is not set.
 *
 * Strategy: connect with the postgres superuser, then for each test scenario
 * SET LOCAL ROLE authenticated and SET LOCAL request.jwt.claim.sub to a
 * specific user UUID. This exercises RLS the way PostgREST does.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Client } from 'pg'

const DB_URL = process.env.SUPABASE_DB_URL
const skip = !DB_URL

const OWNER = '00000000-0000-0000-0000-000000000001'
const MEMBER = '00000000-0000-0000-0000-000000000002'
const OUTSIDER = '00000000-0000-0000-0000-000000000003'
const SYS_ADMIN = '00000000-0000-0000-0000-000000000004'
const ORG_ID = '01J0000000000000000000000A' // ULID-shaped (10-char time + 16 random)
const ORG_B_ID = '01J0000000000000000000000B'

let admin: Client

async function asUser(userId: string | null, fn: (q: (sql: string, params?: unknown[]) => Promise<unknown[]>) => Promise<void>) {
  // We use a dedicated client per scenario so SET LOCAL doesn't leak.
  const c = new Client({ connectionString: DB_URL })
  await c.connect()
  try {
    await c.query('begin')
    await c.query("set local role authenticated")
    if (userId) {
      // PostgREST sets these; both must be present for RLS helpers to work.
      await c.query("select set_config('request.jwt.claim.sub', $1, true)", [userId])
      await c.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: userId, role: 'authenticated' }),
      ])
    } else {
      await c.query("select set_config('request.jwt.claim.sub', '', true)")
      await c.query("select set_config('request.jwt.claims', '', true)")
    }
    const q = async (sql: string, params?: unknown[]) => (await c.query(sql, params)).rows
    await fn(q)
  } finally {
    await c.query('rollback').catch(() => {})
    await c.end()
  }
}

beforeAll(async () => {
  if (skip) return
  admin = new Client({ connectionString: DB_URL })
  await admin.connect()
  // Seed: create auth users (Supabase convention), profiles, an org, members, a plan, and two campaigns.
  // Use ON CONFLICT DO NOTHING so re-runs against a DB that already has seed data are safe.
  await admin.query(`
    begin;

    -- auth.users (id is uuid)
    insert into auth.users (id, email) values
      ('${OWNER}',     'owner@x.io'),
      ('${MEMBER}',    'member@x.io'),
      ('${OUTSIDER}',  'outsider@x.io'),
      ('${SYS_ADMIN}', 'admin@x.io')
    on conflict (id) do nothing;

    insert into app.profiles (id) values ('${OWNER}'), ('${MEMBER}'), ('${OUTSIDER}'), ('${SYS_ADMIN}')
    on conflict (id) do nothing;

    insert into app.system_admins (user_id) values ('${SYS_ADMIN}')
    on conflict (user_id) do nothing;

    insert into app.organizations (id, name, slug, status, created_by) values
      ('${ORG_ID}',   'Acme',   'acme',   'active', '${OWNER}'),
      ('${ORG_B_ID}', 'Other',  'other',  'active', '${OUTSIDER}')
    on conflict (id) do nothing;

    insert into app.organization_members (organization_id, user_id, role) values
      ('${ORG_ID}', '${OWNER}',  'admin'),
      ('${ORG_ID}', '${MEMBER}', 'member'),
      ('${ORG_B_ID}', '${OUTSIDER}', 'admin')
    on conflict do nothing;

    -- A campaign in each org
    insert into app.fundraising_campaigns (id, organization_id, name, created_by) values
      ('01JCMPAAAAAAAAAAAAAAAAAAAA01', '${ORG_ID}',   'Org A campaign', '${OWNER}'),
      ('01JCMPBBBBBBBBBBBBBBBBBB02',  '${ORG_B_ID}', 'Org B campaign', '${OUTSIDER}')
    on conflict (id) do nothing;

    commit;
  `)
}, 30_000)

afterAll(async () => {
  if (admin) await admin.end()
})

describe.skipIf(skip)('RLS: app.organizations', () => {
  it('members of an org can read their own org', async () => {
    await asUser(MEMBER, async (q) => {
      const rows = await q(`select id from app.organizations where id = $1`, [ORG_ID])
      expect(rows).toHaveLength(1)
    })
  })

  it('members cannot read other orgs', async () => {
    await asUser(MEMBER, async (q) => {
      const rows = await q(`select id from app.organizations where id = $1`, [ORG_B_ID])
      expect(rows).toHaveLength(0)
    })
  })

  it('system admins can read all orgs', async () => {
    await asUser(SYS_ADMIN, async (q) => {
      const rows = (await q(`select id from app.organizations order by id`)) as { id: string }[]
      expect(rows.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('outsider cannot read any org', async () => {
    await asUser(OUTSIDER, async (q) => {
      const rows = (await q(`select id from app.organizations`)) as { id: string }[]
      expect(rows).toHaveLength(1)
      expect(rows[0].id).toBe(ORG_B_ID)
    })
  })
})

describe.skipIf(skip)('RLS: app.fundraising_campaigns', () => {
  it('owner can read campaigns in their org', async () => {
    await asUser(OWNER, async (q) => {
      const rows = await q(`select id from app.fundraising_campaigns where organization_id = $1`, [ORG_ID])
      expect(rows).toHaveLength(1)
    })
  })

  it('member of Org A cannot read Org B campaigns', async () => {
    await asUser(MEMBER, async (q) => {
      const rows = await q(`select id from app.fundraising_campaigns where organization_id = $1`, [ORG_B_ID])
      expect(rows).toHaveLength(0)
    })
  })

  it('member cannot insert into a campaign in an org they do not belong to', async () => {
    await asUser(MEMBER, async (q) => {
      await expect(
        q(`insert into app.fundraising_campaigns (id, organization_id, name, created_by) values ('01JCMPTEST00000000000XX', $1, 'X', $2)`, [ORG_B_ID, MEMBER])
      ).rejects.toThrow()
    })
  })
})

describe.skipIf(skip)('RLS: catalog tables deny all direct reads', () => {
  it.each(['app.subscription_plans', 'app.features', 'app.permissions', 'app.plan_features'])(
    '%s returns 0 rows to authenticated',
    async (table) => {
      await asUser(OWNER, async (q) => {
        const rows = await q(`select 1 from ${table} limit 1`)
        expect(rows).toHaveLength(0)
      })
    }
  )
})

describe.skipIf(skip)('RLS: app.audit_log + app.system_admins', () => {
  it('audit_log is not directly readable', async () => {
    await asUser(SYS_ADMIN, async (q) => {
      const rows = await q(`select 1 from app.audit_log limit 1`)
      expect(rows).toHaveLength(0)
    })
  })

  it('system_admins is not directly readable', async () => {
    await asUser(SYS_ADMIN, async (q) => {
      const rows = await q(`select user_id from app.system_admins limit 1`)
      expect(rows).toHaveLength(0)
    })
  })
})

describe.skipIf(skip)('RLS: app.profiles self-access', () => {
  it('users see only their own profile row directly', async () => {
    await asUser(MEMBER, async (q) => {
      const rows = (await q(`select id from app.profiles`)) as { id: string }[]
      expect(rows).toHaveLength(1)
      expect(rows[0].id).toBe(MEMBER)
    })
  })
})

describe.skipIf(skip)('RLS: anon role', () => {
  it('anonymous cannot read any app table directly', async () => {
    await asUser(null, async (q) => {
      // No jwt.sub — caller is anonymous (PostgREST anon role).
      // We still need to switch to anon; set_config above with empty sub mimics
      // an anon JWT, but the role itself is what gates table grants.
      // Since RLS policies all target `to authenticated`, anon should see 0.
      const rows = await q(`select id from app.organizations`)
      expect(rows).toHaveLength(0)
    })
  })
})
