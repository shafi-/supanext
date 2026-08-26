import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the Supabase client manager used by BaseRepository.
// Every service call must map to the exact api.* function name and p_* args.
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

import { adminService } from './AdminService'
import { inviteService } from './InviteService'
import { memberService } from './MemberService'
import { organizationService } from './OrganizationService'
import { profileService } from './ProfileService'
import { subscriptionService } from './SubscriptionService'
import { campaignService } from './CampaignService'

const ORG = '00000000-0000-4000-8000-00000000aaaa'
const USER = '00000000-0000-4000-8000-00000000bbbb'
const PLAN = '00000000-0000-4000-8000-00000000cccc'

describe('service → rpc arg mapping', () => {
  beforeEach(() => {
    rpcMock.mockClear()
    rpcMock.mockResolvedValue({ data: null, error: null })
  })

  it('AdminService.approveOrganization sends p_org_id', async () => {
    await adminService.approveOrganization(ORG)
    expect(rpcMock).toHaveBeenCalledWith('approve_organization', { p_org_id: ORG })
  })

  it('AdminService.suspendOrganization requires the note', async () => {
    await adminService.suspendOrganization(ORG, 'terms')
    expect(rpcMock).toHaveBeenCalledWith('suspend_organization', {
      p_org_id: ORG,
      p_note: 'terms',
    })
  })

  it('AdminService.createPlan maps camelCase → p_* args', async () => {
    await adminService.createPlan({
      code: 'pro',
      name: 'Pro',
      description: 'd',
      priceMinor: 9900,
      currency: 'USD',
      billingInterval: 'month',
    })
    expect(rpcMock).toHaveBeenCalledWith('create_plan', {
      p_code: 'pro',
      p_name: 'Pro',
      p_description: 'd',
      p_price_minor: 9900,
      p_currency: 'USD',
      p_billing_interval: 'month',
    })
  })

  it('AdminService.assignSubscription defaults status to active', async () => {
    await adminService.assignSubscription(ORG, PLAN)
    expect(rpcMock).toHaveBeenCalledWith('assign_subscription', {
      p_org_id: ORG,
      p_plan_id: PLAN,
      p_status: 'active',
      p_starts_at: undefined,
      p_ends_at: undefined,
    })
  })

  it('InviteService.inviteMember passes role and optional org', async () => {
    await inviteService.inviteMember('x@y.z', 'admin', ORG)
    expect(rpcMock).toHaveBeenCalledWith('invite_member', {
      p_email: 'x@y.z',
      p_role: 'admin',
      p_org_id: ORG,
    })
  })

  it('MemberService.setMemberPermission carries granted flag', async () => {
    await memberService.setMemberPermission(USER, 'fundraising.view', true, ORG)
    expect(rpcMock).toHaveBeenCalledWith('set_member_permission', {
      p_user_id: USER,
      p_permission: 'fundraising.view',
      p_granted: true,
      p_org_id: ORG,
    })
  })

  it('OrganizationService.requestOrganization sends name+slug', async () => {
    await organizationService.requestOrganization('Acme', 'acme')
    expect(rpcMock).toHaveBeenCalledWith('request_organization', {
      p_name: 'Acme',
      p_slug: 'acme',
    })
  })

  it('CampaignService.createCampaign omits unset optionals', async () => {
    await campaignService.createCampaign({ name: 'C', orgId: ORG })
    expect(rpcMock).toHaveBeenCalledWith('create_campaign', {
      p_name: 'C',
      p_description: undefined,
      p_goal_minor: undefined,
      p_currency: undefined,
      p_starts_at: undefined,
      p_ends_at: undefined,
      p_org_id: ORG,
    })
  })

  it('ProfileService.updateMyProfile forwards both fields', async () => {
    await profileService.updateMyProfile('Bob', 'https://x/y.png')
    expect(rpcMock).toHaveBeenCalledWith('update_my_profile', {
      p_display_name: 'Bob',
      p_avatar_url: 'https://x/y.png',
    })
  })

  it('SubscriptionService.getCurrentSubscription is read-only surface', async () => {
    await subscriptionService.getCurrentSubscription(ORG)
    expect(rpcMock).toHaveBeenCalledWith('get_current_subscription', { p_org_id: ORG })
  })

  // NOTE: error normalization ({data:null,error}) lives in SupabaseClientManager.rpc,
  // which is mocked out here. Services intentionally let rejections propagate.
  it('services propagate rpc rejections (normalization is the wrapper\'s job)', async () => {
    rpcMock.mockRejectedValueOnce(new Error('boom'))
    await expect(adminService.listPlans()).rejects.toThrow('boom')
  })
})
