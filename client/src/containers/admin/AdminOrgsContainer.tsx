'use client'

import { adminService } from '@/services/AdminService'
import { useSystemAdmin } from '@/hooks/useSystemAdmin'
import { useCallback } from 'react'
import Link from 'next/link'
import { AdminOrgsView } from '@/components/admin/AdminOrgsView'
import { usePaginatedList } from '@/hooks/usePaginatedList'

export default function AdminOrgsContainer() {
  const { isSystemAdmin, loading: adminLoading } = useSystemAdmin()
  const {
    items: orgs,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
  } = usePaginatedList({
    fetcher: useCallback((params) => adminService.listAllOrganizations(params), []),
    enabled: isSystemAdmin,
  })

  const act = useCallback(
    async (fn: () => Promise<{ error: string | null }>) => {
      const { error: err } = await fn()
      if (err) {
        // Error is already set by the hook if the refresh fails
        // But we want to surface action errors immediately
        console.error(err)
      }
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
    <AdminOrgsView
      orgs={orgs}
      loading={loading}
      loadingMore={loadingMore}
      error={error}
      hasMore={hasMore}
      onLoadMore={loadMore}
      onApprove={(id) => act(() => adminService.approveOrganization(id))}
      onReject={(id) => act(() => adminService.rejectOrganization(id))}
      onSuspend={(id, note) => act(() => adminService.suspendOrganization(id, note))}
      onUnsuspend={(id) => act(() => adminService.unsuspendOrganization(id))}
    />
  )
}
