'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  subscriptionService,
  type CurrentSubscription,
} from '@/services/SubscriptionService'

export function useSubscription() {
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await subscriptionService.getMySubscription()
    setSubscription(data)
    setError(err)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const hasFeature = useCallback(
    (featureCode: string) =>
      subscription?.features?.includes(featureCode) ?? false,
    [subscription]
  )

  return { subscription, loading, error, refresh, hasFeature }
}
