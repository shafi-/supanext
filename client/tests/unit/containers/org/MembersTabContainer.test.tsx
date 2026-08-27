import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MembersTabContainer } from '@/containers/org/MembersTabContainer'
import { memberService } from '@/services/MemberService'

vi.mock('@/services/MemberService', () => ({
  memberService: {
    getMembers: vi.fn(),
    changeMemberRole: vi.fn(),
    removeMember: vi.fn(),
    setMemberPermission: vi.fn(),
  },
}))

const mockGetMembers = vi.mocked(memberService.getMembers)
const mockChangeMemberRole = vi.mocked(memberService.changeMemberRole)
const mockRemoveMember = vi.mocked(memberService.removeMember)
const mockSetMemberPermission = vi.mocked(memberService.setMemberPermission)

describe('MembersTabContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    mockChangeMemberRole.mockResolvedValue({ data: undefined, error: null })
    mockRemoveMember.mockResolvedValue({ data: undefined, error: null })
    mockSetMemberPermission.mockResolvedValue({ data: undefined, error: null })
  })

  it('renders members fetched from the service', async () => {
    render(<MembersTabContainer orgId="org1" isAdmin={true} />)

    expect((await screen.findAllByText('a@b.com')).length).toBeGreaterThan(0)
  })

  it('calls changeMemberRole when an admin changes a member role', async () => {
    render(<MembersTabContainer orgId="org1" isAdmin={true} />)

    const select = await screen.findByRole('combobox')
    fireEvent.change(select, { target: { value: 'admin' } })

    await waitFor(() => {
      expect(mockChangeMemberRole).toHaveBeenCalledWith('u1', 'admin', 'org1')
    })
  })

  it('calls removeMember when an admin removes a member', async () => {
    render(<MembersTabContainer orgId="org1" isAdmin={true} />)

    const removeButton = await screen.findByRole('button', { name: 'Remove' })
    fireEvent.click(removeButton)

    await waitFor(() => {
      expect(mockRemoveMember).toHaveBeenCalledWith('u1', 'org1')
    })
  })
})
