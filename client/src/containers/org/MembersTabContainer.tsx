'use client'

import { useState, useEffect, useCallback } from 'react'
import { memberService } from '@/services/MemberService'
import { Permission } from '@/types/permissions'
import { OrgMembers, type MemberRow } from '@/components/org/OrgMembers'

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
  const [members, setMembers] = useState<MemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await memberService.getMembers(orgId)
    if (data) setMembers(data)
    if (err) setError(err)
    setLoading(false)
  }, [orgId])

  useEffect(() => {
    void load()
  }, [load])

  const handleRoleChange = async (userId: string, role: string) => {
    const { error: err } = await memberService.changeMemberRole(userId, role as 'admin' | 'member', orgId)
    if (err) setError(err)
    await load()
  }

  const handleRemove = async (userId: string) => {
    const { error: err } = await memberService.removeMember(userId, orgId)
    if (err) setError(err)
    await load()
  }

  const handlePermission = async (userId: string, permission: string, granted: boolean) => {
    const { error: err } = await memberService.setMemberPermission(userId, permission, granted, orgId)
    if (err) setError(err)
    await load()
  }

  return (
    <OrgMembers
      members={members}
      loading={loading}
      error={error}
      isAdmin={isAdmin}
      grantablePermissions={GRANTABLE_PERMISSIONS}
      onRoleChange={handleRoleChange}
      onRemove={handleRemove}
      onPermission={handlePermission}
    />
  )
}
