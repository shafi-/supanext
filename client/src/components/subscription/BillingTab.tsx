'use client'

import { useState, useEffect, useCallback } from 'react'
import { subscriptionService } from '@/services/SubscriptionService'
import type { CurrentSubscription, SubscriptionPlan, SubscriptionHistoryView } from '@/types'
import { subscriptionPlanService } from '@/services/SubscriptionPlanService'

interface BillingTabProps {
  orgId: string
  isOwner: boolean
}

export function BillingTab({ orgId, isOwner }: BillingTabProps) {
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

  const handleSubscribe = async (planId: string) => {
    setPurchasing(planId)
    const { error } = await subscriptionService.subscribe(orgId, planId, billingPeriod)
    if (!error) loadData()
    setPurchasing(null)
  }

  const handleChangePlan = async (planId: string) => {
    setPurchasing(planId)
    const { error } = await subscriptionService.changePlan(orgId, planId, billingPeriod)
    if (!error) loadData()
    setPurchasing(null)
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return
    await subscriptionService.cancel(orgId)
    loadData()
  }

  if (loading) return <div className="py-8 text-center text-gray-500">Loading...</div>

  return (
    <div className="space-y-8">
      {/* Current Plan */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Current Plan</h3>
        {currentPlan ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold">{currentPlan.plan_name}</span>
              <span className={`text-xs px-2 py-1 rounded ${
                currentPlan.status === 'active' ? 'bg-green-100 text-green-800' :
                currentPlan.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {currentPlan.status}
              </span>
            </div>
            <p className="text-gray-600">{currentPlan.description}</p>
            <div className="text-sm text-gray-500">
              ${currentPlan.billing_period === 'yearly' ? currentPlan.price_yearly : currentPlan.price_monthly}/{currentPlan.billing_period === 'yearly' ? 'year' : 'month'}
            </div>
            <div className="text-sm text-gray-500">
              Renews: {new Date(currentPlan.current_period_end).toLocaleDateString()}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {(currentPlan.features || []).map(f => (
                <span key={f} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">{f}</span>
              ))}
            </div>
            {isOwner && (
              <button
                onClick={handleCancel}
                className="mt-4 text-red-600 hover:underline text-sm"
              >
                Cancel Subscription
              </button>
            )}
          </div>
        ) : (
          <p className="text-gray-500">No active subscription</p>
        )}
      </div>

      {/* Available Plans */}
      {isOwner && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Available Plans</h3>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-3 py-1 rounded text-sm ${billingPeriod === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-3 py-1 rounded text-sm ${billingPeriod === 'yearly' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
            >
              Yearly
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {plans.filter(p => p.is_active).map(plan => {
              const isCurrent = currentPlan?.plan_id === plan.id
              const price = billingPeriod === 'yearly' ? plan.price_yearly : plan.price_monthly
              return (
                <div key={plan.id} className={`border rounded-lg p-4 ${isCurrent ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                  <h4 className="font-semibold">{plan.name}</h4>
                  <p className="text-2xl font-bold mt-2">${price}<span className="text-sm font-normal">/{billingPeriod === 'yearly' ? 'yr' : 'mo'}</span></p>
                  <p className="text-gray-600 text-sm mt-2">{plan.description}</p>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {(plan.features || []).map(f => (
                      <span key={f} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">{f}</span>
                    ))}
                  </div>
                  <div className="mt-4">
                    {isCurrent ? (
                      <span className="text-blue-600 text-sm">Current Plan</span>
                    ) : currentPlan ? (
                      <button
                        onClick={() => handleChangePlan(plan.id)}
                        disabled={purchasing === plan.id}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
                      >
                        {purchasing === plan.id ? 'Processing...' : 'Pay Now'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSubscribe(plan.id)}
                        disabled={purchasing === plan.id}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
                      >
                        {purchasing === plan.id ? 'Processing...' : 'Pay Now'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Billing History */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Billing History</h3>
        {history.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Action</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Plan</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Amount</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {history.map(h => (
                <tr key={h.id}>
                  <td className="px-4 py-3">{new Date(h.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 capitalize">{h.action}</td>
                  <td className="px-4 py-3">{h.plan_name}</td>
                  <td className="px-4 py-3">${h.amount}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded ${
                      h.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                      h.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {h.payment_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500 text-center py-4">No billing history</p>
        )}
      </div>
    </div>
  )
}
