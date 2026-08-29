'use client'

import { adminService } from '@/services/AdminService'
import { useSystemAdmin } from '@/hooks/useSystemAdmin'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AdminSubscriptionsView } from '@/components/admin/AdminSubscriptionsView'
import type {
  AdminSubscriptionUserRow,
  AdminSubscriptionPlanRow,
} from '@/components/admin/AdminSubscriptionsView'

export default function AdminSubscriptionsContainer() {
  const { isSystemAdmin, loading: adminLoading } = useSystemAdmin()
  const [users, setUsers] = useState<AdminSubscriptionUserRow[]>([])
  const [plans, setPlans] = useState<AdminSubscriptionPlanRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const [{ data: userData }, { data: planData }] = await Promise.all([
      adminService.listAllUsers({ limit: 1000 }),
      adminService.listPlans({ limit: 1000 }),
    ])
    if (userData) setUsers(userData)
    if (planData) setPlans(planData)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isSystemAdmin) void refresh()
  }, [isSystemAdmin, refresh])

  const assign = useCallback(
    async (userId: string, planId: string) => {
      const { error: err } = await adminService.assignSubscription(
        userId,
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
    async (userId: string) => {
      const { error: err } = await adminService.deactivateSubscription(userId)
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
        <p className="mt-2 text-gray-600">You don&apos;t have permission to access this page.</p>
        <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">
          Back to home
        </Link>
      </div>
    )
  }

  return (
    <AdminSubscriptionsView
      users={users}
      plans={plans}
      loading={loading}
      error={error}
      onAssign={assign}
      onDeactivate={deactivate}
    />
  )
}
