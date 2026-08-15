'use client'

import { useOrganization } from './useOrganization'

const PERMISSIONS = {
  owner: ['*'],
  admin: ['org:read', 'org:update', 'member:read', 'member:create', 'member:update', 'member:delete', 'todo:create', 'todo:read', 'todo:update', 'todo:delete'],
  member: ['org:read', 'member:read', 'todo:create', 'todo:read', 'todo:update', 'todo:delete'],
  viewer: ['org:read', 'member:read', 'todo:read'],
} as const

export function usePermissions() {
  const { membership } = useOrganization()

  const role = membership?.role ?? 'viewer'
  const permissions = PERMISSIONS[role as keyof typeof PERMISSIONS] ?? PERMISSIONS.viewer

  const hasPermission = (permission: string): boolean => {
    if (permissions.includes('*' as never)) return true
    return permissions.includes(permission as never)
  }

  const isOrgAdmin = (): boolean => role === 'owner' || role === 'admin'
  const isOrgOwner = (): boolean => role === 'owner'
  const isOrgMember = (): boolean => ['owner', 'admin', 'member'].includes(role)

  return {
    role,
    permissions,
    hasPermission,
    isOrgAdmin,
    isOrgOwner,
    isOrgMember,
  }
}
