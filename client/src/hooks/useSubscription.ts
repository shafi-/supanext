'use client'

import { useState, useEffect, useCallback } from 'react'
import type { CurrentSubscription } from '@/types'
import { subscriptionService } from '@/services/SubscriptionService'

export function useSubscription(orgId: string | null) {
  const [currentPlan, setCurrentPlan] = useState<CurrentSubscription | null>(null)
  const [loading, setLoading] = useState(true)

  const hasFeature = useCallback(
    (feature: string): boolean => {
      return currentPlan?.features?.includes(feature) ?? false
    },
    [currentPlan]
  )

  const loadSubscription = useCallback(async () => {
    if (!orgId) {
      setCurrentPlan(null)
      setLoading(false)
      return
    }

    try {
      const { data, error } = await subscriptionService.getMySubscription(orgId)
      if (error || !data) {
        setCurrentPlan(null)
      } else {
        setCurrentPlan(data as unknown as CurrentSubscription)
      }
    } catch {
      setCurrentPlan(null)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    loadSubscription()
  }, [loadSubscription])

  return {
    currentPlan,
    loading,
    hasFeature,
    refetch: loadSubscription,
  }
}
