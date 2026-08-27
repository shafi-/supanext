import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { InvitesTabContainer } from '@/containers/org/InvitesTabContainer'
import { inviteService } from '@/services/InviteService'

vi.mock('@/services/InviteService', () => ({
  inviteService: {
    inviteMember: vi.fn(),
    getInvitationPreview: vi.fn(),
    acceptInvitation: vi.fn(),
    revokeInvitation: vi.fn(),
  },
}))

const mockInviteMember = vi.mocked(inviteService.inviteMember)

describe('InvitesTabContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInviteMember.mockResolvedValue({
      data: { invitation_id: 'i1', token: 't', expires_at: '2099-01-01T00:00:00Z' },
      error: null,
    })
  })

  it('calls inviteMember with the entered email, role and orgId', async () => {
    render(<InvitesTabContainer orgId="org1" />)

    const input = screen.getByPlaceholderText(/Invite by email/i)
    fireEvent.change(input, { target: { value: 'test@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Invite' }))

    await waitFor(() => {
      expect(mockInviteMember).toHaveBeenCalledWith('test@example.com', 'member', 'org1')
    })
  })

  it('shows a confirmation once the invitation is created', async () => {
    render(<InvitesTabContainer orgId="org1" />)

    const input = screen.getByPlaceholderText(/Invite by email/i)
    fireEvent.change(input, { target: { value: 'test@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Invite' }))

    expect(await screen.findByText(/Invitation created for test@example.com/i)).toBeInTheDocument()
  })
})
