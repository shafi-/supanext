'use client'

import type { CurrentSubscription } from '@/services/SubscriptionService'

interface BillingTabProps {
  subscription: CurrentSubscription | null
  loading: boolean
  error?: string | null
}

/**
 * Read-only billing view for members.
 * Plans are assigned by system admins — see the admin console.
 */
export function BillingTab({ subscription, loading, error }: BillingTabProps) {
  if (loading)
    return <div className="py-8 text-center text-gray-500">Loading...</div>
  if (error) return <p className="py-8 text-center text-red-600">{error}</p>

  const hasPlan = subscription && subscription.plan_id

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold">Current Plan</h3>
        {!hasPlan ? (
          <p className="text-gray-500">
            No active subscription. A system administrator assigns plans to your
            organization.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold">
                {subscription.plan_name}
              </span>
              <span
                className={`rounded px-2 py-1 text-xs ${
                  subscription.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : subscription.status === 'trialing'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-600'
                }`}
              >
                {subscription.status}
              </span>
            </div>
            {subscription.ends_at && (
              <p className="text-sm text-gray-500">
                Ends {new Date(subscription.ends_at).toLocaleDateString()}
              </p>
            )}
            <div>
              <p className="mb-1 text-sm font-medium text-gray-700">
                Included features
              </p>
              <div className="flex flex-wrap gap-2">
                {(subscription.features ?? []).map(f => (
                  <span
                    key={f}
                    className="rounded-full bg-gray-100 px-2 py-0.5 text-xs"
                  >
                    {f}
                  </span>
                ))}
                {(subscription.features ?? []).length === 0 && (
                  <span className="text-sm text-gray-400">None</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400">
        Plan changes are performed by system administrators and audited.
      </p>
    </div>
  )
}
