'use client'

import { useOrganization } from './useOrganization'

/**
 * System-admin flag comes from api.get_session_context — exposed via
 * OrganizationProvider to avoid a duplicate RPC call.
 */
export function useSystemAdmin() {
  const { isSystemAdmin, adminLoading: loading } = useOrganization()
  return { isSystemAdmin, loading, refetch: () => Promise.resolve() }
}
