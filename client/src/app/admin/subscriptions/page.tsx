'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { adminService } from '@/services/AdminService'
import { useSystemAdmin } from '@/hooks/useSystemAdmin'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

interface AdminOrgRow {
  id: string
  name: string
  slug: string
  status: string
}

interface AdminPlan {
  id: string
  name: string
}

export default function AdminSubscriptionsPage() {
  const { isSystemAdmin, loading: adminLoading } = useSystemAdmin()
  const [orgs, setOrgs] = useState<AdminOrgRow[]>([])
  const [plans, setPlans] = useState<AdminPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    const [{ data: orgData }, { data: planData }] = await Promise.all([
      adminService.listAllOrganizations(),
      adminService.listPlans(),
    ])
    if (orgData) setOrgs(orgData)
    if (planData) setPlans(planData)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isSystemAdmin) void refresh()
  }, [isSystemAdmin, refresh])

  if (adminLoading) return <AppLayout><div>Loading...</div></AppLayout>

  if (!isSystemAdmin) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">Back to home</Link>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Organization Subscriptions</h1>
        {error && <p className="text-red-600">{error}</p>}
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organization</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assign Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orgs.map((org) => (
                  <tr key={org.id}>
                    <td className="px-4 py-3 whitespace-nowrap">{org.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{org.status}</td>
                    <td className="px-4 py-3 whitespace-nowrap space-x-2">
                      {org.status === 'active' && plans.length > 0 ? (
                        <>
                          <select id={`plan-${org.id}`}
                            className="border rounded px-2 py-1 text-sm">
                            {plans.map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          <button disabled={busy}
                            onClick={async () => {
                              setBusy(true)
                              const sel = document.getElementById(`plan-${org.id}`) as HTMLSelectElement
                              const { error: err } = await adminService.assignSubscription(
                                org.id,
                                sel.value,
                                'active',
                                new Date().toISOString()
                              )
                              if (err) setError(err)
                              setBusy(false)
                            }}
                            className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50">
                            Assign
                          </button>
                          <button disabled={busy}
                            onClick={async () => {
                              setBusy(true)
                              const { error: err } = await adminService.deactivateSubscription(org.id)
                              if (err) setError(err)
                              setBusy(false)
                            }}
                            className="px-2 py-1 border border-red-300 text-red-600 rounded text-xs hover:bg-red-50 disabled:opacity-50">
                            Deactivate
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Link href="/admin" className="text-blue-600 hover:underline inline-block">← Admin home</Link>
      </div>
    </AppLayout>
  )
}
