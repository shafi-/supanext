import { useSubscription } from '@/hooks/useSubscription'
import { BillingTab } from '@/components/subscription/BillingTab'

interface BillingReadonlyProps {
  orgId: string
}

export function BillingReadonly({ orgId }: BillingReadonlyProps) {
  const { subscription, loading, error } = useSubscription(orgId)
  return <BillingTab subscription={subscription} loading={loading} error={error} />
}