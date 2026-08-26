'use client'

import { useAuth } from './useAuth'
import { organizationService } from '@/services/OrganizationService'
import { useCallback, useEffect, useState } from 'react'

/**
 * System-admin flag comes from api.get_session_context — the security.*
 * helpers are intentionally not exposed over HTTP.
 */
export function useSystemAdmin() {
  const { user } = useAuth()
  const [isSystemAdmin, setIsSystemAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const checkAdmin = useCallback(async () => {
    if (!user) {
      setIsSystemAdmin(false)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await organizationService.getSessionContext()
    setIsSystemAdmin(data?.is_system_admin === true)
    setLoading(false)
  }, [user])

  useEffect(() => {
    void checkAdmin()
  }, [checkAdmin])

  return { isSystemAdmin, loading, refetch: checkAdmin }
}
