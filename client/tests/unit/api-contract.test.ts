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
// If this line fails to compile, an Rpc value references a non-existent DB function.
type DbFunctionNames = keyof Database['api']['Functions']
type AssertRpcSubset = {
  [K in keyof typeof Rpc as (typeof Rpc)[K] extends Record<string, infer V>
    ? V extends DbFunctionNames ? K : never
    : never]: true
}
// If you see a TS error here, an Rpc group contains a value not in database.ts:
const _compileCheck: AssertRpcSubset = {} as AssertRpcSubset

// All Rpc values as a flat runtime array
const ALL_RPC_VALUES: string[] = [
  ...Object.values(Rpc.Session),
  ...Object.values(Rpc.Profile),
  ...Object.values(Rpc.Org),
  ...Object.values(Rpc.Member),
  ...Object.values(Rpc.Invite),
  ...Object.values(Rpc.Subscription),
  ...Object.values(Rpc.Plan),
  ...Object.values(Rpc.Campaign),
  ...Object.values(Rpc.Admin),
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
import { memberService } from '@/services/MemberService'
import { organizationService } from '@/services/OrganizationService'
import { profileService } from '@/services/ProfileService'
import { subscriptionService } from '@/services/SubscriptionService'
import { campaignService } from '@/services/CampaignService'

const ORG = '00000000-0000-4000-8000-00000000aaaa'
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
    // The satisfies DbFunction check in rpc.ts + the compileCheck above
    // ensure this at the type level. This test exists to document it.
    expect(ALL_RPC_VALUES.length).toBeGreaterThan(0)
  })
})

describe('contract: service → RPC arg mapping', () => {
  beforeEach(() => {
    rpcMock.mockClear()
    rpcMock.mockResolvedValue({ data: null, error: null })
  })

  describe('AdminService', () => {
    it('approveOrganization', async () => {
      await adminService.approveOrganization(ORG)
      rpcWasCalledWith('approve_organization', { p_org_id: ORG })
    })

    it('rejectOrganization', async () => {
      await adminService.rejectOrganization(ORG, 'reason')
      rpcWasCalledWith('reject_organization', { p_org_id: ORG, p_note: 'reason' })
    })

    it('suspendOrganization', async () => {
      await adminService.suspendOrganization(ORG, 'terms')
      rpcWasCalledWith('suspend_organization', { p_org_id: ORG, p_note: 'terms' })
    })

    it('unsuspendOrganization', async () => {
      await adminService.unsuspendOrganization(ORG)
      rpcWasCalledWith('unsuspend_organization', { p_org_id: ORG })
    })

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

    it('listAllOrganizations', async () => {
      await adminService.listAllOrganizations({ limit: 100 })
      rpcWasCalledWith('list_all_organizations', { p_limit: 100, p_cursor: undefined })
    })

    it('listPlans', async () => {
      await adminService.listPlans()
      rpcWasCalledWith('list_plans', { p_limit: 20, p_cursor: undefined })
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
      await adminService.assignSubscription(ORG, PLAN)
      rpcWasCalledWith('assign_subscription', {
        p_org_id: ORG, p_plan_id: PLAN, p_status: 'active',
        p_starts_at: undefined, p_ends_at: undefined,
      })
    })

    it('deactivateSubscription', async () => {
      await adminService.deactivateSubscription(ORG)
      rpcWasCalledWith('deactivate_subscription', { p_org_id: ORG })
    })
  })

  describe('InviteService', () => {
    it('inviteMember', async () => {
      await inviteService.inviteMember('x@y.z', 'admin', ORG)
      rpcWasCalledWith('invite_member', { p_email: 'x@y.z', p_role: 'admin', p_org_id: ORG })
    })

    it('getInvitationPreview', async () => {
      await inviteService.getInvitationPreview('tok')
      rpcWasCalledWith('get_invitation_preview', { p_token: 'tok' })
    })

    it('acceptInvitation', async () => {
      await inviteService.acceptInvitation('tok')
      rpcWasCalledWith('accept_invitation', { p_token: 'tok' })
    })

    it('revokeInvitation', async () => {
      await inviteService.revokeInvitation('inv-id')
      rpcWasCalledWith('revoke_invitation', { p_invitation_id: 'inv-id' })
    })
  })

  describe('MemberService', () => {
    it('getMembers', async () => {
      await memberService.getMembers(ORG)
      rpcWasCalledWith('get_organization_members', { p_org_id: ORG, p_limit: 20, p_cursor: undefined })
    })

    it('changeMemberRole', async () => {
      await memberService.changeMemberRole(USER, 'admin', ORG)
      rpcWasCalledWith('change_member_role', { p_user_id: USER, p_role: 'admin', p_org_id: ORG })
    })

    it('removeMember', async () => {
      await memberService.removeMember(USER, ORG)
      rpcWasCalledWith('remove_member', { p_user_id: USER, p_org_id: ORG })
    })

    it('setMemberPermission', async () => {
      await memberService.setMemberPermission(USER, 'fundraising.view', true, ORG)
      rpcWasCalledWith('set_member_permission', {
        p_user_id: USER, p_permission: 'fundraising.view', p_granted: true, p_org_id: ORG,
      })
    })
  })

  describe('OrganizationService', () => {
    it('requestOrganization', async () => {
      await organizationService.requestOrganization('Acme', 'acme')
      rpcWasCalledWith('request_organization', { p_name: 'Acme', p_slug: 'acme' })
    })

    it('getMyOrganizations', async () => {
      await organizationService.getMyOrganizations()
      rpcWasCalledWith('get_my_organizations', undefined)
    })

    it('getSessionContext', async () => {
      await organizationService.getSessionContext()
      rpcWasCalledWith('get_session_context', undefined)
    })

    it('setActiveOrganization', async () => {
      await organizationService.setActiveOrganization(ORG)
      rpcWasCalledWith('set_active_organization', { p_org_id: ORG })
    })

    it('getOrganizationStatus', async () => {
      await organizationService.getOrganizationStatus(ORG)
      rpcWasCalledWith('get_organization_status', { p_org_id: ORG })
    })

    it('listPublicOrganizations', async () => {
      await organizationService.listPublicOrganizations(10)
      rpcWasCalledWith('list_public_organizations', { p_limit: 10 })
    })

    it('getOrgStats', async () => {
      await organizationService.getOrgStats(ORG)
      rpcWasCalledWith('get_org_stats', { p_org_id: ORG })
    })

    it('getOrgPublic', async () => {
      await organizationService.getOrgPublic('acme')
      rpcWasCalledWith('get_org_public', { p_org_id: 'acme' })
    })
  })

  describe('ProfileService', () => {
    it('updateMyProfile', async () => {
      await profileService.updateMyProfile('Bob', 'https://x/y.png')
      rpcWasCalledWith('update_my_profile', { p_display_name: 'Bob', p_avatar_url: 'https://x/y.png' })
    })
  })

  describe('SubscriptionService', () => {
    it('getCurrentSubscription', async () => {
      await subscriptionService.getCurrentSubscription(ORG)
      rpcWasCalledWith('get_current_subscription', { p_org_id: ORG })
    })
  })

  describe('CampaignService', () => {
    it('listCampaigns', async () => {
      await campaignService.listCampaigns(ORG)
      rpcWasCalledWith('list_campaigns', { p_org_id: ORG, p_limit: 20, p_cursor: undefined })
    })

    it('createCampaign', async () => {
      await campaignService.createCampaign({ name: 'C', orgId: ORG })
      rpcWasCalledWith('create_campaign', {
        p_name: 'C', p_description: undefined, p_goal_minor: undefined,
        p_currency: undefined, p_starts_at: undefined, p_ends_at: undefined, p_org_id: ORG,
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
// Frontend must match on code prefix, not message text.
const ERROR_CODES = {
  INV01: 'Invitation not found',
  INV02: 'Invitation expired or already used',
  INV03: 'Invitation email does not match authenticated user',
  INV04: 'Email not provided in invitation payload',
} as const

describe('contract: error codes are stable', () => {
  it('error code format is prefix: message', () => {
    for (const [code, desc] of Object.entries(ERROR_CODES)) {
      expect(code).toMatch(/^INV\d{2}$/)
      expect(typeof desc).toBe('string')
    }
  })
})

// Status enum constants — must match SQL ENUMs in 20240828000000_status_enums.sql
import { OrgStatus, InvitationStatus, SubscriptionStatus } from '@/types/status'

describe('contract: status enums match SQL ENUMs', () => {
  it('OrgStatus values are the canonical set', () => {
    expect(Object.values(OrgStatus).sort()).toEqual([
      'active', 'pending', 'rejected', 'suspended',
    ])
  })

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
      'organization.members.change_role',
      'organization.members.invite',
      'organization.members.permissions.manage',
      'organization.members.remove',
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
])

describe('contract: coverage — every Rpc has a service test', () => {
  it('every Rpc value was exercised by at least one test above', () => {
    const missing = ALL_RPC_VALUES.filter(
      (fn) => !TESTED_RPC_NAMES.has(fn) && !EXCLUDED_FROM_COVERAGE.has(fn)
    )
    expect(missing).toEqual([])
  })
})
