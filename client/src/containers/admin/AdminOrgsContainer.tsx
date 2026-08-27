'use client'

import { adminService } from '@/services/AdminService'
import { useSystemAdmin } from '@/hooks/useSystemAdmin'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AdminOrgsView } from '@/components/admin/AdminOrgsView'
import type { AdminOrgRow } from '@/components/admin/AdminOrgsView'

export default function AdminOrgsContainer() {
  const { isSystemAdmin, loading: adminLoading } = useSystemAdmin()
  const [orgs, setOrgs] = useState<AdminOrgRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const { data, error: err } = await adminService.listAllOrganizations()
    if (data) setOrgs(data)
    setError(err)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isSystemAdmin) void refresh()
  }, [isSystemAdmin, refresh])

  const act = useCallback(
    async (fn: () => Promise<{ error: string | null }>) => {
      const { error: err } = await fn()
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
    <AdminOrgsView
      orgs={orgs}
      loading={loading}
      error={error}
      onApprove={(id) => act(() => adminService.approveOrganization(id))}
      onReject={(id) => act(() => adminService.rejectOrganization(id))}
      onSuspend={(id, note) => act(() => adminService.suspendOrganization(id, note))}
      onUnsuspend={(id) => act(() => adminService.unsuspendOrganization(id))}
    />
  )
}
