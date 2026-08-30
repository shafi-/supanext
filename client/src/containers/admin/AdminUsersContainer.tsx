'use client'

import { adminService, type AdminUserRow } from '@/services/AdminService'
import { useSystemAdmin } from '@/hooks/useSystemAdmin'
import { useCallback } from 'react'
import Link from 'next/link'
import { AdminUsersView } from '@/components/admin/AdminUsersView'
import { usePaginatedList } from '@/hooks/usePaginatedList'

export default function AdminUsersContainer() {
  const { isSystemAdmin, loading: adminLoading } = useSystemAdmin()
  const {
    items: users,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
  } = usePaginatedList<AdminUserRow>({
    fetcher: useCallback(params => adminService.listAllUsers(params), []),
    enabled: isSystemAdmin,
    cursorField: 'id',
  })

  const act = useCallback(
    async (fn: () => Promise<{ error: string | null }>) => {
      const { error: err } = await fn()
      if (err) {
        console.error(err)
      }
      await refresh()
    },
    [refresh]
  )

  if (adminLoading) return <div>Loading...</div>

  if (!isSystemAdmin) {
    return (
      <div className="py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
        <p className="mt-2 text-gray-600">
          You don&apos;t have permission to access this page.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-blue-600 hover:underline"
        >
          Back to home
        </Link>
      </div>
    )
  }

  return (
    <AdminUsersView
      users={users}
      loading={loading}
      loadingMore={loadingMore}
      error={error}
      hasMore={hasMore}
      onLoadMore={loadMore}
      onGrantAdmin={id => act(() => adminService.grantSystemAdmin(id))}
      onRevokeAdmin={id => act(() => adminService.revokeSystemAdmin(id))}
    />
  )
}
