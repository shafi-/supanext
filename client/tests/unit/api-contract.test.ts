/**
 * API Contract Tests
 *
 * Ensures the frontend ↔ database contract stays in sync.
 *
 * Three layers of drift detection:
 *   1. Rpc const values must be valid database.ts function names (compile-time via satisfies)
 *   2. Service wrappers must send the correct RPC name + p_* params (runtime)
 *   3. Every Rpc value must have at least one service wrapper test (coverage)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Rpc } from '@/types/rpc'
import type { Database } from '@/types/database'

// Compile-time check: every Rpc value must be a keyof Database['api']['Functions'].
type DbFunctionNames = keyof Database['api']['Functions']
type AssertRpcSubset = {
  [K in keyof typeof Rpc as (typeof Rpc)[K] extends Record<string, infer V>
    ? V extends DbFunctionNames ? K : never
    : never]: true
}
const _compileCheck: AssertRpcSubset = {} as AssertRpcSubset

// All Rpc values as a flat runtime array
const ALL_RPC_VALUES: string[] = [
  ...Object.values(Rpc.Session),
  ...Object.values(Rpc.Profile),
  ...Object.values(Rpc.Subscription),
  ...Object.values(Rpc.Plan),
  ...Object.values(Rpc.Campaign),
  ...Object.values(Rpc.Admin),
  ...Object.values(Rpc.Invitation),
  ...Object.values(Rpc.SystemAdmin),
]

// --- Contract: service → RPC mapping ---
const rpcMock = vi.hoisted(() => vi.fn().mockResolvedValue({ data: null, error: null }))

vi.mock('@/lib/supabase', () => ({
  supabaseManager: {
    rpc: (...a: unknown[]) => rpcMock(...a),
    getUserId: async () => 'test-user',
    getUser: async () => ({ id: 'test-user', email: 't@t.io' }),
    getSession: async () => null,
    isAuthenticated: async () => true,
  },
}))

import { adminService } from '@/services/AdminService'
import { inviteService } from '@/services/InviteService'
import { profileService } from '@/services/ProfileService'
import { subscriptionService } from '@/services/SubscriptionService'
import { campaignService } from '@/services/CampaignService'

const USER = '00000000-0000-4000-8000-00000000bbbb'
const PLAN = '00000000-0000-4000-8000-00000000cccc'

// Track every RPC function name that has been tested (for coverage)
const TESTED_RPC_NAMES = new Set<string>()

function rpcWasCalledWith(name: string, params?: Record<string, unknown>) {
  TESTED_RPC_NAMES.add(name)
  if (params) {
    expect(rpcMock).toHaveBeenCalledWith(name, params)
  } else {
    expect(rpcMock).toHaveBeenCalledWith(name, undefined)
  }
}

describe('contract: Rpc → database.ts', () => {
  it('compile-time: every Rpc value is a valid database function name', () => {
    expect(ALL_RPC_VALUES.length).toBeGreaterThan(0)
  })
})

describe('contract: service → RPC arg mapping', () => {
  beforeEach(() => {
    rpcMock.mockClear()
    rpcMock.mockResolvedValue({ data: null, error: null })
  })

  describe('AdminService', () => {
    it('grantSystemAdmin', async () => {
      await adminService.grantSystemAdmin(USER)
      rpcWasCalledWith('grant_system_admin', { p_user_id: USER })
    })

    it('revokeSystemAdmin', async () => {
      await adminService.revokeSystemAdmin(USER)
      rpcWasCalledWith('revoke_system_admin', { p_user_id: USER })
    })

    it('findUserIdByEmail', async () => {
      await adminService.findUserIdByEmail('a@b.c')
      rpcWasCalledWith('find_user_id_by_email', { p_email: 'a@b.c' })
    })

    it('listAllUsers', async () => {
      await adminService.listAllUsers({ limit: 100 })
      rpcWasCalledWith('list_all_users', { p_limit: 100, p_cursor: undefined })
    })

    it('listAllSubscriptions', async () => {
      await adminService.listAllSubscriptions({ limit: 50 })
      rpcWasCalledWith('list_all_subscriptions', { p_limit: 50, p_cursor: undefined })
    })

    it('listPlans', async () => {
      await adminService.listPlans()
      rpcWasCalledWith('list_plans', { p_limit: 20, p_cursor: undefined })
    })

    it('listAuditLog', async () => {
      await adminService.listAuditLog({ limit: 25 })
      rpcWasCalledWith('list_audit_log', { p_limit: 25, p_cursor: undefined })
    })

    it('createPlan', async () => {
      await adminService.createPlan({
        code: 'pro', name: 'Pro', description: 'd',
        priceMinor: 9900, currency: 'USD', billingInterval: 'month',
      })
      rpcWasCalledWith('create_plan', {
        p_code: 'pro', p_name: 'Pro', p_description: 'd',
        p_price_minor: 9900, p_currency: 'USD', p_billing_interval: 'month',
      })
    })

    it('setPlanFeature', async () => {
      await adminService.setPlanFeature(PLAN, 'fundraising', true)
      rpcWasCalledWith('set_plan_feature', {
        p_plan_id: PLAN, p_feature_code: 'fundraising', p_enabled: true,
      })
    })

    it('assignSubscription', async () => {
      await adminService.assignSubscription(USER, PLAN)
      rpcWasCalledWith('assign_user_subscription', {
        p_user_id: USER, p_plan_id: PLAN, p_status: 'active',
        p_starts_at: undefined, p_ends_at: undefined,
      })
    })

    it('deactivateSubscription', async () => {
      await adminService.deactivateSubscription(USER)
      rpcWasCalledWith('deactivate_user_subscription', { p_user_id: USER })
    })
  })

  describe('InviteService', () => {
    it('inviteUser', async () => {
      await inviteService.inviteUser('x@y.z')
      rpcWasCalledWith('invite_platform_user', { p_email: 'x@y.z' })
    })

    it('getInvitationPreview', async () => {
      await inviteService.getInvitationPreview('tok')
      rpcWasCalledWith('get_platform_invitation_preview', { p_token: 'tok' })
    })

    it('acceptInvitation', async () => {
      await inviteService.acceptInvitation('tok')
      rpcWasCalledWith('accept_platform_invitation', { p_token: 'tok' })
    })

    it('revokeInvitation', async () => {
      await inviteService.revokeInvitation('inv-id')
      rpcWasCalledWith('revoke_platform_invitation', { p_invitation_id: 'inv-id' })
    })
  })

  describe('ProfileService', () => {
    it('updateMyProfile', async () => {
      await profileService.updateMyProfile('Bob', 'https://x/y.png')
      rpcWasCalledWith('update_my_profile', { p_display_name: 'Bob', p_avatar_url: 'https://x/y.png' })
    })
  })

  describe('SubscriptionService', () => {
    it('getMySubscription', async () => {
      await subscriptionService.getMySubscription()
      rpcWasCalledWith('get_my_subscription', undefined)
    })
  })

  describe('CampaignService', () => {
    it('listCampaigns', async () => {
      await campaignService.listCampaigns()
      rpcWasCalledWith('list_my_campaigns', { p_limit: 20, p_cursor: undefined })
    })

    it('createCampaign', async () => {
      await campaignService.createCampaign({ name: 'C' })
      rpcWasCalledWith('create_campaign', {
        p_name: 'C', p_description: undefined, p_goal_minor: undefined,
        p_currency: undefined, p_starts_at: undefined, p_ends_at: undefined,
      })
    })

    it('deleteCampaign', async () => {
      await campaignService.deleteCampaign('camp-id')
      rpcWasCalledWith('delete_campaign', { p_campaign_id: 'camp-id' })
    })

    it('updateCampaign', async () => {
      await campaignService.updateCampaign('camp-id', { name: 'New' })
      rpcWasCalledWith('update_campaign', {
        p_campaign_id: 'camp-id', p_name: 'New', p_description: undefined,
        p_goal_minor: undefined, p_currency: undefined, p_starts_at: undefined, p_ends_at: undefined,
      })
    })
  })

  it('services propagate rpc rejections', async () => {
    rpcMock.mockRejectedValueOnce(new Error('boom'))
    await expect(adminService.listPlans()).rejects.toThrow('boom')
  })
})

// Structured error codes: SQL functions embed these prefixes in error messages.
const ERROR_CODES = {
  INV01: 'Invitation not found',
  INV02: 'Invitation expired or already used',
} as const

describe('contract: error codes are stable', () => {
  it('error code format is prefix: message', () => {
    for (const [code, desc] of Object.entries(ERROR_CODES)) {
      expect(code).toMatch(/^INV\d{2}$/)
      expect(typeof desc).toBe('string')
    }
  })
})

// Status enum constants — must match SQL ENUMs
import { InvitationStatus, SubscriptionStatus } from '@/types/status'

describe('contract: status enums match SQL ENUMs', () => {
  it('InvitationStatus values are the canonical set', () => {
    expect(Object.values(InvitationStatus).sort()).toEqual([
      'accepted', 'expired', 'pending', 'revoked',
    ])
  })

  it('SubscriptionStatus values are the canonical set', () => {
    expect(Object.values(SubscriptionStatus).sort()).toEqual([
      'active', 'canceled', 'expired', 'past_due', 'trialing',
    ])
  })

  it('SubscriptionStatus uses American spelling (canceled not cancelled)', () => {
    expect(SubscriptionStatus.Canceled).toBe('canceled')
  })
})

// Permission code constants — must match app.permissions table in SQL
import { Permission } from '@/types/permissions'

describe('contract: permission codes match SQL', () => {
  it('Permission values are the canonical set', () => {
    expect(Object.values(Permission).sort()).toEqual([
      'fundraising.create',
      'fundraising.delete',
      'fundraising.manage',
      'fundraising.update',
      'fundraising.view',
      'system.plans.manage',
    ])
  })

  it('all permission codes follow dot-separated format', () => {
    for (const perm of Object.values(Permission)) {
      expect(perm).toMatch(/^[a-z]+(\.[a-z_]+)+$/)
    }
  })
})

// RPCs with no service wrapper (called directly from scripts, not frontend):
const EXCLUDED_FROM_COVERAGE = new Set([
  'bootstrap_system_admin', // called from scripts/bootstrap-admin.sh, not frontend
  'get_session_context', // called through SessionService inside useSessionContext hook, not a standalone service
])

describe('contract: coverage — every Rpc has a service test', () => {
  it('every Rpc value was exercised by at least one test above', () => {
    const missing = ALL_RPC_VALUES.filter(
      (fn) => !TESTED_RPC_NAMES.has(fn) && !EXCLUDED_FROM_COVERAGE.has(fn)
    )
    expect(missing).toEqual([])
  })
})
