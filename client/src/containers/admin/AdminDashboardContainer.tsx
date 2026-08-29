'use client'

import { adminService } from '@/services/AdminService'
import { useSystemAdmin } from '@/hooks/useSystemAdmin'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AdminDashboardView } from '@/components/admin/AdminDashboardView'
import type { AdminOrgRow } from '@/components/admin/AdminDashboardView'

export default function AdminDashboardContainer() {
  const { isSystemAdmin, loading: adminLoading } = useSystemAdmin()
  const [orgs, setOrgs] = useState<AdminOrgRow[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const { data } = await adminService.listAllOrganizations({ limit: 1000 })
    if (data) setOrgs(data.items)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isSystemAdmin) void refresh()
  }, [isSystemAdmin, refresh])

  const onRunSysAdmin = useCallback(
    async (op: 'grant' | 'revoke', email: string): Promise<string | null> => {
      const lookup = await adminService.findUserIdByEmail(email.trim())
      if (!lookup.data) return lookup.error ?? 'No user found with that email'
      const { error } = op === 'grant'
        ? await adminService.grantSystemAdmin(lookup.data)
        : await adminService.revokeSystemAdmin(lookup.data)
      if (!error) await refresh()
      return error
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

  if (loading) return <div>Loading...</div>

  const pending = orgs.filter((o) => o.status === 'pending').length
  const active = orgs.filter((o) => o.status === 'active').length
  const suspended = orgs.filter((o) => o.status === 'suspended').length

  return (
    <AdminDashboardView pending={pending} active={active} suspended={suspended} onRunSysAdmin={onRunSysAdmin} />
  )
}
