'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { subscriptionPlanService } from '@/services/SubscriptionPlanService'
import { useSystemAdmin } from '@/hooks/useSystemAdmin'
import { useState, useEffect, useCallback } from 'react'
import type { OrganizationSubscriptionView, SubscriptionHistoryView } from '@/types'
import Link from 'next/link'

export default function AdminSubscriptionsPage() {
  const { isSystemAdmin, loading: adminLoading } = useSystemAdmin()
  const [subscriptions, setSubscriptions] = useState<OrganizationSubscriptionView[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null)
  const [history, setHistory] = useState<SubscriptionHistoryView[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const loadSubscriptions = useCallback(async () => {
    const { data } = await subscriptionPlanService.getOrgSubscriptions()
    if (data) setSubscriptions(data as unknown as OrganizationSubscriptionView[])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isSystemAdmin) loadSubscriptions()
  }, [isSystemAdmin, loadSubscriptions])

  const loadHistory = async (orgId: string) => {
    setSelectedOrg(orgId)
    setHistoryLoading(true)
    const { data } = await subscriptionPlanService.getHistory(orgId)
    if (data) setHistory(data as unknown as SubscriptionHistoryView[])
    setHistoryLoading(false)
  }

  const handlePause = async (orgId: string) => {
    await subscriptionPlanService.pauseSubscription(orgId)
    loadSubscriptions()
  }

  const handleUnpause = async (orgId: string) => {
    await subscriptionPlanService.unpauseSubscription(orgId)
    loadSubscriptions()
  }

  if (adminLoading) return <AppLayout><div>Loading...</div></AppLayout>

  if (!isSystemAdmin) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">You don&apos;t have permission to access this page.</p>
          <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">Back to home</Link>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <Link href="/admin" className="text-sm text-gray-500 hover:underline">← Back to Admin</Link>
          <h1 className="text-2xl font-bold mt-2">Organization Subscriptions</h1>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Organization</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Plan</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Period</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Price</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Renewal</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {subscriptions.map(sub => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{sub.org_name}</td>
                    <td className="px-4 py-3">{sub.plan_name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded ${
                        sub.status === 'active' ? 'bg-green-100 text-green-800' :
                        sub.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 capitalize">{sub.billing_period}</td>
                    <td className="px-4 py-3">
                      ${sub.billing_period === 'yearly' ? sub.price_yearly : sub.price_monthly}/{sub.billing_period === 'yearly' ? 'yr' : 'mo'}
                    </td>
                    <td className="px-4 py-3">
                      {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => loadHistory(sub.organization_id)} className="text-blue-600 hover:underline text-sm">History</button>
                        {sub.status === 'active' ? (
                          <button onClick={() => handlePause(sub.organization_id)} className="text-orange-600 hover:underline text-sm">Pause</button>
                        ) : sub.status === 'paused' ? (
                          <button onClick={() => handleUnpause(sub.organization_id)} className="text-green-600 hover:underline text-sm">Unpause</button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {subscriptions.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No subscriptions yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {selectedOrg && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Billing History</h2>
              <button onClick={() => setSelectedOrg(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            {historyLoading ? (
              <div>Loading...</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Action</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Plan</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Notes</th>
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
                      <td className="px-4 py-3 text-gray-600">{h.notes || '-'}</td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No history</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
