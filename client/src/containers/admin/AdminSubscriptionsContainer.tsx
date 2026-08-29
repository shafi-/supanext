'use client'

import { adminService } from '@/services/AdminService'
import { useSystemAdmin } from '@/hooks/useSystemAdmin'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AdminSubscriptionsView } from '@/components/admin/AdminSubscriptionsView'
import type {
  AdminSubscriptionOrgRow,
  AdminSubscriptionPlanRow,
} from '@/components/admin/AdminSubscriptionsView'

export default function AdminSubscriptionsContainer() {
  const { isSystemAdmin, loading: adminLoading } = useSystemAdmin()
  const [orgs, setOrgs] = useState<AdminSubscriptionOrgRow[]>([])
  const [plans, setPlans] = useState<AdminSubscriptionPlanRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const [{ data: orgData }, { data: planData }] = await Promise.all([
      adminService.listAllOrganizations({ limit: 1000 }),
      adminService.listPlans({ limit: 1000 }),
    ])
    if (orgData) setOrgs(orgData.items)
    if (planData) setPlans(planData.items)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isSystemAdmin) void refresh()
  }, [isSystemAdmin, refresh])

  const assign = useCallback(
    async (orgId: string, planId: string) => {
      const { error: err } = await adminService.assignSubscription(
        orgId,
        planId,
        'active',
        new Date().toISOString()
      )
      if (err) setError(err)
      await refresh()
    },
    [refresh]
  )

  const deactivate = useCallback(
    async (orgId: string) => {
      const { error: err } = await adminService.deactivateSubscription(orgId)
      if (err) setError(err)
      await refresh()
    },
    [refresh]
  )

  if (adminLoading) return <div>Loading...</div>

  if (!isSystemAdmin) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
        <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">
          Back to home
        </Link>
      </div>
    )
  }

  return (
    <AdminSubscriptionsView
      orgs={orgs}
      plans={plans}
      loading={loading}
      error={error}
      onAssign={assign}
      onDeactivate={deactivate}
    />
  )
}
