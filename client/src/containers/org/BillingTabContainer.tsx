'use client'

import { useSubscription } from '@/hooks/useSubscription'
import { BillingTab } from '@/components/subscription/BillingTab'

interface BillingTabContainerProps {
  orgId: string
}

export function BillingTabContainer({ orgId }: BillingTabContainerProps) {
  const { subscription, loading, error } = useSubscription(orgId)
  return <BillingTab subscription={subscription} loading={loading} error={error} />
}
