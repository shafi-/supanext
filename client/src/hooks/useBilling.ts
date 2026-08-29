'use client'

import { useCallback, useEffect, useState } from 'react'
import { subscriptionService, type CurrentSubscription } from '@/services/SubscriptionService'

/**
 * Read-only billing view for users.
 * Plan assignment/deactivation is system-administered (see AdminService) —
 * the database rejects user mutations regardless of UI.
 */
export function useBilling() {
  const [billing, setBilling] = useState<CurrentSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await subscriptionService.getMySubscription()
    setBilling(data)
    setError(err)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { billing, loading, error, refresh }
}
