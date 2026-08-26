'use client'

import { useCallback, useEffect, useState } from 'react'
import { subscriptionService, type CurrentSubscription } from '@/services/SubscriptionService'

/**
 * Read-only billing view for members.
 * Plan assignment/deactivation is system-administered (see AdminService) —
 * the database rejects member/org-admin mutations regardless of UI.
 */
export function useBilling(orgId?: string) {
  const [billing, setBilling] = useState<CurrentSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!orgId) {
      setBilling(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: err }= await subscriptionService.getCurrentSubscription(orgId)
    setBilling(data)
    setError(err)
    setLoading(false)
  }, [orgId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { billing, loading, error, refresh }
}
