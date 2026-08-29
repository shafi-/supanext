'use client'

import { useCallback } from 'react'
import { memberService, type MemberRow } from '@/services/MemberService'
import { Permission } from '@/types/permissions'
import { OrgMembers } from '@/components/org/OrgMembers'
import { usePaginatedList } from '@/hooks/usePaginatedList'

const GRANTABLE_PERMISSIONS = [
  Permission.FundraisingView,
  Permission.FundraisingCreate,
  Permission.FundraisingUpdate,
  Permission.FundraisingDelete,
]

interface MembersTabContainerProps {
  orgId: string
  isAdmin: boolean
}

export function MembersTabContainer({ orgId, isAdmin }: MembersTabContainerProps) {
  const {
    items: members,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
  } = usePaginatedList<MemberRow>({
    fetcher: useCallback((params) => memberService.getMembers(orgId, params), [orgId]),
    cursorField: 'user_id',
  })

  const handleRoleChange = async (userId: string, role: string) => {
    const { error: err } = await memberService.changeMemberRole(userId, role as 'admin' | 'member', orgId)
    if (err) return
    await refresh()
  }

  const handleRemove = async (userId: string) => {
    const { error: err } = await memberService.removeMember(userId, orgId)
    if (err) return
    await refresh()
  }

  const handlePermission = async (userId: string, permission: string, granted: boolean) => {
    const { error: err } = await memberService.setMemberPermission(userId, permission, granted, orgId)
    if (err) return
    await refresh()
  }

  return (
    <OrgMembers
      members={members}
      loading={loading}
      loadingMore={loadingMore}
      error={error}
      hasMore={hasMore}
      onLoadMore={loadMore}
      isAdmin={isAdmin}
      grantablePermissions={GRANTABLE_PERMISSIONS}
      onRoleChange={handleRoleChange}
      onRemove={handleRemove}
      onPermission={handlePermission}
    />
  )
}
