'use client'

import { useOrganization } from './useOrganization'

const PERMISSIONS = {
  admin: ['org:read', 'org:update', 'org:delete', 'members:read', 'members:create', 'members:update', 'members:delete', 'todos:read', 'todos:create', 'todos:update', 'todos:delete', 'invites:read', 'invites:create', 'invites:delete'],
  member: ['org:read', 'members:read', 'todos:read', 'todos:create', 'todos:update', 'todos:delete', 'invites:read'],
  viewer: ['org:read', 'members:read', 'todos:read'],
} as const

export function usePermissions() {
  const { membership } = useOrganization()

  const role = membership?.role ?? 'viewer'
  const isOwner = membership?.is_owner ?? false
  const permissions = PERMISSIONS[role as keyof typeof PERMISSIONS] ?? PERMISSIONS.viewer

  const hasPermission = (permission: string): boolean => {
    if (isOwner) return true
    return permissions.includes(permission as never)
  }

  const isOrgAdmin = (): boolean => role === 'admin'
  const isOrgOwner = (): boolean => isOwner
  const isOrgMember = (): boolean => ['admin', 'member'].includes(role)

  return {
    role,
    isOwner,
    permissions,
    hasPermission,
    isOrgAdmin,
    isOrgOwner,
    isOrgMember,
  }
}
