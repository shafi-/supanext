'use client'

import { adminService } from '@/services/AdminService'
import { useSystemAdmin } from '@/hooks/useSystemAdmin'
import { useCallback } from 'react'
import Link from 'next/link'
import { usePaginatedList } from '@/hooks/usePaginatedList'
import { AdminAuditLogView } from '@/components/admin/AdminAuditLogView'

export default function AdminAuditLogContainer() {
  const { isSystemAdmin, loading: adminLoading } = useSystemAdmin()
  const {
    items: entries,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
  } = usePaginatedList({
    fetcher: useCallback((params) => adminService.listAuditLog(params), []),
    enabled: isSystemAdmin,
  })

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
    <AdminAuditLogView
      entries={entries}
      loading={loading}
      loadingMore={loadingMore}
      error={error}
      hasMore={hasMore}
      onLoadMore={loadMore}
    />
  )
}
