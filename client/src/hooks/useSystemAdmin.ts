'use client'

import { useSessionContext } from './useSessionContext'

/**
 * System-admin flag comes from api.get_session_context — exposed via
 * SessionContextProvider to avoid a duplicate RPC call.
 */
export function useSystemAdmin() {
  const { isSystemAdmin, loading } = useSessionContext()
  return { isSystemAdmin, loading, refetch: () => Promise.resolve() }
}
