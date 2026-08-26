'use client'

import { useState, useEffect, useCallback } from 'react'
import { subscriptionService } from '@/services/SubscriptionService'
import { subscriptionPlanService } from '@/services/SubscriptionPlanService'
import type { CurrentSubscription, SubscriptionPlan, SubscriptionHistoryView } from '@/types'

export function useBilling(orgId: string) {
  const [currentPlan, setCurrentPlan] = useState<CurrentSubscription | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [history, setHistory] = useState<SubscriptionHistoryView[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')

  const loadData = useCallback(async () => {
    const [currentResult, plansResult, historyResult] = await Promise.all([
      subscriptionService.getMySubscription(orgId),
      subscriptionService.getPlans(),
      subscriptionPlanService.getHistory(orgId),
    ])

    if (currentResult.data) setCurrentPlan(currentResult.data as unknown as CurrentSubscription)
    if (plansResult.data) setPlans(plansResult.data as unknown as SubscriptionPlan[])
    if (historyResult.data) setHistory(historyResult.data as unknown as SubscriptionHistoryView[])

    setLoading(false)
  }, [orgId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const subscribe = useCallback(
    async (planId: string) => {
      setPurchasing(planId)
      const { error } = await subscriptionService.subscribe(orgId, planId, billingPeriod)
      if (!error) await loadData()
      setPurchasing(null)
    },
    [orgId, billingPeriod, loadData]
  )

  const changePlan = useCallback(
    async (planId: string) => {
      setPurchasing(planId)
      const { error } = await subscriptionService.changePlan(orgId, planId, billingPeriod)
      if (!error) await loadData()
      setPurchasing(null)
    },
    [orgId, billingPeriod, loadData]
  )

  const cancel = useCallback(async () => {
    await subscriptionService.cancel(orgId)
    await loadData()
  }, [orgId, loadData])

  return {
    currentPlan,
    plans,
    history,
    loading,
    purchasing,
    billingPeriod,
    setBillingPeriod,
    subscribe,
    changePlan,
    cancel,
  }
}
