'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { adminService } from '@/services/AdminService'
import { useSystemAdmin } from '@/hooks/useSystemAdmin'
import { useState, useEffect } from 'react'
import type { OrganizationDetailView } from '@/types'
import Link from 'next/link'

export default function AdminOrgsPage() {
  const { isSystemAdmin, loading: adminLoading } = useSystemAdmin()
  const [orgs, setOrgs] = useState<OrganizationDetailView[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isSystemAdmin) {
      const load = async () => {
        const { data } = await adminService.getAllOrgs()
        if (data) setOrgs(data)
        setLoading(false)
      }
      load()
    }
  }, [isSystemAdmin])

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
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Members</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orgs.map((org) => (
                  <tr key={org.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{org.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{org.slug}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{org.member_count}</td>
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
