'use client'

import { useOrganization } from './useOrganization'

/**
 * Client-side fallback matrix. Mirrors the seeded role_permissions in the
 * database. The database is the source of truth — membership.permissions
 * (from get_membership RPC) takes precedence when available.
 */
const FALLBACK_PERMISSIONS = {
  admin: ['org:read', 'org:update', 'org:delete', 'members:read', 'members:create', 'members:update', 'members:delete', 'todos:read', 'todos:create', 'todos:update', 'todos:delete', 'invites:read', 'invites:create', 'invites:delete'],
  member: ['org:read', 'members:read', 'todos:read', 'todos:create', 'todos:update', 'todos:delete', 'invites:read'],
  viewer: ['org:read', 'members:read', 'todos:read'],
} as const

export function usePermissions() {
  const { membership } = useOrganization()

  const role = membership?.role ?? 'viewer'
  const isOwner = membership?.is_owner ?? false

  // Prefer live permissions from get_membership; fall back to static matrix.
  const dbPermissions = membership?.permissions?.filter(Boolean) ?? []
  const permissions = dbPermissions.length > 0
    ? dbPermissions
    : [...(FALLBACK_PERMISSIONS[role as keyof typeof FALLBACK_PERMISSIONS] ?? FALLBACK_PERMISSIONS.viewer)]

  const hasPermission = (permission: string): boolean => {
    if (isOwner) return true
    return permissions.includes(permission) || permissions.includes('*')
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
