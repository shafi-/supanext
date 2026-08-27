import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { OverviewTabContainer } from '@/containers/org/OverviewTabContainer'
import { organizationService } from '@/services/OrganizationService'

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

const mockGetStatus = vi.mocked(organizationService.getOrganizationStatus)

describe('OverviewTabContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetStatus.mockResolvedValue({
      data: { id: 'org1', name: 'Acme', status: 'active', suspension_note: null },
      error: null,
    })
  })

  it('renders the organization status fetched from the service', async () => {
    render(<OverviewTabContainer orgId="org1" />)

    expect(await screen.findByText('Acme')).toBeInTheDocument()
    expect(await screen.findByText('active')).toBeInTheDocument()
  })

  it('passes the orgId to getOrganizationStatus', async () => {
    render(<OverviewTabContainer orgId="org1" />)

    await waitFor(() => {
      expect(mockGetStatus).toHaveBeenCalledWith('org1')
    })
  })
})
