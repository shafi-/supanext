'use client'

import { useOrganization } from './useOrganization'

/**
 * Client-side gating only — the database remains the source of truth.
 * Org admins implicitly hold every organization-scoped permission;
 * members hold exactly what admins granted them (member.permissions).
 */
export function usePermissions() {
  const { membership, currentOrg } = useOrganization()

  const role = membership?.role ?? null
  const isOrgAdmin = (): boolean => role === 'admin'
  const isOrgMember = (): boolean => role !== null
  // No owner concept in the current schema.
  const isOrgOwner = (): boolean => false

  return {
    role,
    isOrgAdmin,
    isOrgMember,
    isOrgOwner,
    orgName: currentOrg?.name ?? null,
    orgStatus: currentOrg?.status ?? null,
  }
}
