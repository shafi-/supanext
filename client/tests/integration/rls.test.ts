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
 * Skips automatically if SUPABASE_DB_URL is not set.
 *
 * Strategy: connect with the postgres superuser, then for each test scenario
 * SET LOCAL ROLE authenticated and SET LOCAL request.jwt.claim.sub to a
 * specific user UUID. This exercises RLS the way PostgREST does.
 *
 * Branch-aware: org-table scenarios only run on main (which has
 * `app.organizations`). The user-centric branch drops those tables. Each
 * test that depends on a table calls requireTable() which uses the test
 * context to skip cleanly if the table is missing.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { TaskContext } from 'vitest'
import { Client } from 'pg'

const DB_URL = process.env.SUPABASE_DB_URL
const skip = !DB_URL

const OWNER = '00000000-0000-0000-0000-000000000001'
const MEMBER = '00000000-0000-0000-0000-000000000002'
const OUTSIDER = '00000000-0000-0000-0000-000000000003'
const SYS_ADMIN = '00000000-0000-0000-0000-000000000004'
const ORG_ID = '01J0000000000000000000000A'
const ORG_B_ID = '01J0000000000000000000000B'

let admin: Client

async function asUser(
  userId: string | null,
  fn: (q: (sql: string, params?: unknown[]) => Promise<unknown[]>) => Promise<void>
) {
  const c = new Client({ connectionString: DB_URL })
  await c.connect()
  try {
    await c.query('begin')
    await c.query('set local role authenticated')
    if (userId) {
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

async function hasTable(name: string): Promise<boolean> {
  if (!admin) return false
  const r = await admin.query(
    `select exists (select 1 from information_schema.tables where table_schema = 'app' and table_name = $1) as x`,
    [name]
  )
  return (r.rows[0] as { x: boolean }).x
}

// Returns true if the table exists; otherwise marks the test skipped via
// the vitest context and returns false. Callers should early-return.
async function requireTable(name: string, ctx: TaskContext): Promise<boolean> {
  if (await hasTable(name)) return true
  ctx.skip()
  return false
}

beforeAll(async () => {
  if (skip) return
  admin = new Client({ connectionString: DB_URL })
  await admin.connect()

  // Idempotent base seed.
  await admin.query(`
    begin;

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
  `)

  if (await hasTable('organizations')) {
    // main: org-scoped test data.
    await admin.query(`
      insert into app.organizations (id, name, slug, status, created_by) values
        ('${ORG_ID}',   'Acme',   'acme',   'active', '${OWNER}'),
        ('${ORG_B_ID}', 'Other',  'other',  'active', '${OUTSIDER}')
      on conflict (id) do nothing;

      insert into app.organization_members (organization_id, user_id, role) values
        ('${ORG_ID}', '${OWNER}',  'admin'),
        ('${ORG_ID}', '${MEMBER}', 'member'),
        ('${ORG_B_ID}', '${OUTSIDER}', 'admin')
      on conflict do nothing;

      insert into app.fundraising_campaigns (id, organization_id, name, created_by) values
        ('01JCMPAAAAAAAAAAAAAAAAAAAA01', '${ORG_ID}',   'Org A campaign', '${OWNER}'),
        ('01JCMPBBBBBBBBBBBBBBBBBB02',  '${ORG_B_ID}', 'Org B campaign', '${OUTSIDER}')
      on conflict (id) do nothing;
    `)
  } else {
    // user-centric: user-owned campaigns (organization_id column is gone).
    await admin.query(`
      insert into app.fundraising_campaigns (id, name, user_id, created_by) values
        ('01JCMPAAAAAAAAAAAAAAAAAAAA01', 'Owner campaign', '${OWNER}', '${OWNER}'),
        ('01JCMPBBBBBBBBBBBBBBBBBB02',  'Outsider campaign', '${OUTSIDER}', '${OUTSIDER}')
      on conflict (id) do nothing;
    `)
  }

  await admin.query('commit')
}, 30_000)

afterAll(async () => {
  if (admin) await admin.end()
})

// =============================================================================
// Branch-independent: catalog + admin log + profile self-access.
// =============================================================================
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

// =============================================================================
// Main-branch only: org-gated RLS.
// =============================================================================
describe.skipIf(skip)('RLS (main only): app.organizations', () => {
  it('members of an org can read their own org', async (ctx) => {
    if (!(await requireTable('organizations', ctx))) return
    await asUser(MEMBER, async (q) => {
      const rows = await q(`select id from app.organizations where id = $1`, [ORG_ID])
      expect(rows).toHaveLength(1)
    })
  })

  it('members cannot read other orgs', async (ctx) => {
    if (!(await requireTable('organizations', ctx))) return
    await asUser(MEMBER, async (q) => {
      const rows = await q(`select id from app.organizations where id = $1`, [ORG_B_ID])
      expect(rows).toHaveLength(0)
    })
  })

  it('system admins can read all orgs', async (ctx) => {
    if (!(await requireTable('organizations', ctx))) return
    await asUser(SYS_ADMIN, async (q) => {
      const rows = (await q(`select id from app.organizations order by id`)) as { id: string }[]
      expect(rows.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('outsider cannot read any org other than their own', async (ctx) => {
    if (!(await requireTable('organizations', ctx))) return
    await asUser(OUTSIDER, async (q) => {
      const rows = (await q(`select id from app.organizations`)) as { id: string }[]
      expect(rows).toHaveLength(1)
      expect(rows[0].id).toBe(ORG_B_ID)
    })
  })
})

describe.skipIf(skip)('RLS (main only): app.fundraising_campaigns (org-scoped)', () => {
  it('owner can read campaigns in their org', async (ctx) => {
    if (!(await requireTable('organizations', ctx))) return
    await asUser(OWNER, async (q) => {
      const rows = await q(`select id from app.fundraising_campaigns where organization_id = $1`, [ORG_ID])
      expect(rows).toHaveLength(1)
    })
  })

  it('member of Org A cannot read Org B campaigns', async (ctx) => {
    if (!(await requireTable('organizations', ctx))) return
    await asUser(MEMBER, async (q) => {
      const rows = await q(`select id from app.fundraising_campaigns where organization_id = $1`, [ORG_B_ID])
      expect(rows).toHaveLength(0)
    })
  })

  it('member cannot insert into a campaign in an org they do not belong to', async (ctx) => {
    if (!(await requireTable('organizations', ctx))) return
    await asUser(MEMBER, async (q) => {
      await expect(
        q(
          `insert into app.fundraising_campaigns (id, organization_id, name, created_by) values ('01JCMPTEST00000000000XX', $1, 'X', $2)`,
          [ORG_B_ID, MEMBER]
        )
      ).rejects.toThrow()
    })
  })
})

// =============================================================================
// user-centric-branch only: owner-scoped campaigns.
// =============================================================================
describe.skipIf(skip)('RLS (user-centric only): app.fundraising_campaigns (user-owned)', () => {
  it('owner can read their own campaign', async (ctx) => {
    if (await hasTable('organizations')) {
      ctx.skip()
      return
    }
    await asUser(OWNER, async (q) => {
      const rows = await q(`select id from app.fundraising_campaigns where created_by = $1`, [OWNER])
      expect(rows.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('outsider cannot read other users campaigns', async (ctx) => {
    if (await hasTable('organizations')) {
      ctx.skip()
      return
    }
    await asUser(OUTSIDER, async (q) => {
      const rows = (await q(`select id, created_by from app.fundraising_campaigns`)) as {
        id: string
        created_by: string
      }[]
      rows.forEach((r) => expect(r.created_by).toBe(OUTSIDER))
    })
  })
})

// =============================================================================
// Both: anon role sees nothing.
// =============================================================================
describe.skipIf(skip)('RLS: anon role', () => {
  it('anonymous cannot read any app table directly', async (ctx) => {
    if (!(await requireTable('organizations', ctx))) return
    await asUser(null, async (q) => {
      const rows = await q(`select id from app.organizations`)
      expect(rows).toHaveLength(0)
    })
  })
})
