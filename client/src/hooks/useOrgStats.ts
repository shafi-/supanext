'use client'

import { useCallback, useEffect, useState } from 'react'
import { organizationService, type OrgStats } from '@/services/OrganizationService'

export function useOrgStats(orgId?: string) {
  const [stats, setStats] = useState<OrgStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!orgId) {
      setStats(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: err } = await organizationService.getOrgStats(orgId)
    setStats(data)
    setError(err)
    setLoading(false)
  }, [orgId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { stats, loading, error, refresh }
}
