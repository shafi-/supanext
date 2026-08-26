'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { adminService } from '@/services/AdminService'
import { useSystemAdmin } from '@/hooks/useSystemAdmin'
import { useCallback, useState, useEffect } from 'react'
import Link from 'next/link'

interface AdminOrgRow {
  id: string
  name: string
  slug: string
  status: string
  suspension_note: string | null
  created_at: string
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-red-100 text-red-800',
  rejected: 'bg-gray-100 text-gray-600',
}

export default function AdminOrgsPage() {
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

  const act = async (fn: () => Promise<{ error: string | null }>) => {
    const { error: err } = await fn()
    if (err) setError(err)
    await refresh()
  }

  if (adminLoading) return <AppLayout><div>Loading...</div></AppLayout>

  if (!isSystemAdmin) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">You don&apos;t have permission to access this page.</p>
          <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">
            Back to home
          </Link>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">All Organizations</h1>
        {error && <p className="text-red-600">{error}</p>}
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orgs.map((org) => (
                  <tr key={org.id}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {org.name}
                      {org.suspension_note && (
                        <span className="block text-xs text-red-500" title={org.suspension_note}>
                          {org.suspension_note}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{org.slug}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs ${STATUS_BADGE[org.status] ?? ''}`}>
                        {org.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap space-x-2">
                      {org.status === 'pending' && (
                        <>
                          <button onClick={() => act(() => adminService.approveOrganization(org.id))}
                            className="text-green-600 hover:text-green-800 text-sm">Approve</button>
                          <button onClick={() => act(() => adminService.rejectOrganization(org.id))}
                            className="text-gray-600 hover:text-gray-800 text-sm">Reject</button>
                        </>
                      )}
                      {org.status === 'active' && (
                        <button onClick={() => {
                          const note = window.prompt('Suspension note (required):')
                          if (note) void act(() => adminService.suspendOrganization(org.id, note))
                        }} className="text-red-600 hover:text-red-800 text-sm">Suspend</button>
                      )}
                      {org.status === 'suspended' && (
                        <button onClick={() => act(() => adminService.unsuspendOrganization(org.id))}
                          className="text-green-600 hover:text-green-800 text-sm">Unsuspend</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
