'use client'

import { useState, useEffect, useCallback } from 'react'
import { publicOrgService, type PublicOrg } from '@/services/PublicOrgService'

export function usePublicOrg(slug: string | null) {
  const [org, setOrg] = useState<PublicOrg | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadOrg = useCallback(async () => {
    if (!slug) {
      setOrg(null)
      setLoading(false)
      return
    }

    try {
      const { data, error: rpcError } = await publicOrgService.getPublicOrg(slug)
      if (rpcError) {
        setError(rpcError)
        setOrg(null)
      } else if (!data || data.length === 0) {
        setError('Organization not found')
        setOrg(null)
      } else {
        setOrg(data[0] as PublicOrg)
        setError(null)
      }
    } catch {
      setError('Failed to load organization')
      setOrg(null)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    loadOrg()
  }, [loadOrg])

  return { org, loading, error, refetch: loadOrg }
}
