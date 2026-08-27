import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OrgDetailsContainer } from '@/containers/org/OrgDetailsContainer'
import { useOrganization } from '@/hooks/useOrganization'
import { useSubscription } from '@/hooks/useSubscription'
import { organizationService } from '@/services/OrganizationService'
import { memberService } from '@/services/MemberService'
import { inviteService } from '@/services/InviteService'

vi.mock('@/hooks/useOrganization', () => ({
  useOrganization: vi.fn(),
}))

vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: vi.fn(),
}))

vi.mock('@/services/OrganizationService', () => ({
  organizationService: {
    getOrganizationStatus: vi.fn(),
    getMyOrganizations: vi.fn(),
    getSessionContext: vi.fn(),
    setActiveOrganization: vi.fn(),
    getOrgStats: vi.fn(),
    listPublicOrganizations: vi.fn(),
    getOrgPublic: vi.fn(),
    requestOrganization: vi.fn(),
  },
}))

vi.mock('@/services/MemberService', () => ({
  memberService: {
    getMembers: vi.fn(),
    changeMemberRole: vi.fn(),
    removeMember: vi.fn(),
    setMemberPermission: vi.fn(),
  },
}))

vi.mock('@/services/InviteService', () => ({
  inviteService: {
    inviteMember: vi.fn(),
    getInvitationPreview: vi.fn(),
    acceptInvitation: vi.fn(),
    revokeInvitation: vi.fn(),
  },
}))

vi.mock('@/containers/org/CampaignsTabContainer', () => ({
  CampaignsTabContainer: () => null,
}))

vi.mock('@/containers/org/BillingTabContainer', () => ({
  BillingTabContainer: () => null,
}))

const mockUseOrganization = vi.mocked(useOrganization)
const mockUseSubscription = vi.mocked(useSubscription)
const mockGetStatus = vi.mocked(organizationService.getOrganizationStatus)
const mockGetMembers = vi.mocked(memberService.getMembers)

describe('OrgDetailsContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseOrganization.mockReturnValue({
      currentOrg: { id: 'org1' },
      switchOrg: vi.fn(),
      refresh: vi.fn(),
    } as unknown as ReturnType<typeof useOrganization>)
    mockUseSubscription.mockReturnValue({
      subscription: { plan_id: 'p' },
      hasFeature: () => true,
    } as unknown as ReturnType<typeof useSubscription>)
    mockGetStatus.mockResolvedValue({
      data: { id: 'org1', name: 'Acme', status: 'active', suspension_note: null },
      error: null,
    })
    mockGetMembers.mockResolvedValue({
      data: [
        {
          user_id: 'u1',
          email: 'a@b.com',
          display_name: null,
          role: 'member',
          permissions: [],
        },
      ],
      error: null,
    })
  })

  const org = {
    id: 'org1',
    name: 'Acme',
    status: 'active' as const,
    role: 'admin' as const,
    slug: 'acme',
    is_active_selection: true,
  }

  it('renders the org name and the overview tab content', async () => {
    render(<OrgDetailsContainer org={org} />)

    expect((await screen.findAllByText('Acme')).length).toBeGreaterThan(0)
    expect((await screen.findAllByText('active')).length).toBeGreaterThan(0)
  })

  it('switches to the members tab and shows member data', async () => {
    render(<OrgDetailsContainer org={org} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Members' }))

    expect((await screen.findAllByText('a@b.com')).length).toBeGreaterThan(0)
    await waitFor(() => {
      expect(mockGetMembers).toHaveBeenCalledWith('org1')
    })
  })

  it('switches to the invitations tab', async () => {
    render(<OrgDetailsContainer org={org} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Invitations' }))

    expect(await screen.findByPlaceholderText(/Invite by email/i)).toBeInTheDocument()
  })
})
