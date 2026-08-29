'use client'

import { adminService, type AdminPlanRow } from '@/services/AdminService'
import { useSystemAdmin } from '@/hooks/useSystemAdmin'
import { useCallback } from 'react'
import Link from 'next/link'
import { AdminPlansView } from '@/components/admin/AdminPlansView'
import { usePaginatedList } from '@/hooks/usePaginatedList'

export default function AdminPlansContainer() {
  const { isSystemAdmin, loading: adminLoading } = useSystemAdmin()
  const {
    items: plans,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
  } = usePaginatedList<AdminPlanRow>({
    fetcher: useCallback((params) => adminService.listPlans(params), []),
    enabled: isSystemAdmin,
    cursorField: 'id',
  })

  const createPlan = useCallback(
    async (input: {
      code: string
      name: string
      description?: string
      priceMinor: number
      currency: string
      billingInterval: 'month' | 'year' | 'one_time'
      featureCode: string
    }): Promise<string | null> => {
      const created = await adminService.createPlan({
        code: input.code,
        name: input.name,
        description: input.description,
        priceMinor: input.priceMinor,
        currency: input.currency,
        billingInterval: input.billingInterval,
      })
      if (created.error) return created.error
      if (created.data && input.featureCode.trim()) {
        const f = await adminService.setPlanFeature(created.data, input.featureCode.trim(), true)
        if (f.error) return f.error
      }
      await refresh()
      return null
    },
    [refresh]
  )

  const toggleFeature = useCallback(
    async (planId: string, featureCode: string) => {
      await adminService.setPlanFeature(planId, featureCode, true)
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
    <AdminPlansView
      plans={plans}
      loading={loading}
      loadingMore={loadingMore}
      error={error}
      hasMore={hasMore}
      onLoadMore={loadMore}
      onCreatePlan={createPlan}
      onToggleFeature={toggleFeature}
    />
  )
}
