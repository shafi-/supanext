'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { adminService } from '@/services/AdminService'
import { useSystemAdmin } from '@/hooks/useSystemAdmin'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface AdminOrgRow {
  id: string
  name: string
  slug: string
  status: string
}

export default function AdminPage() {
  const { isSystemAdmin, loading: adminLoading } = useSystemAdmin()
  const [orgs, setOrgs] = useState<AdminOrgRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isSystemAdmin) {
      const load = async () => {
        const { data } = await adminService.listAllOrganizations()
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

  if (loading) return <AppLayout><div>Loading...</div></AppLayout>

  const pending = orgs.filter((o) => o.status === 'pending').length
  const active = orgs.filter((o) => o.status === 'active').length
  const suspended = orgs.filter((o) => o.status === 'suspended').length

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">System Admin</h1>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">Pending Approval</p>
            <p className="text-2xl font-bold">{pending}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">Active Orgs</p>
            <p className="text-2xl font-bold">{active}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-500">Suspended</p>
            <p className="text-2xl font-bold">{suspended}</p>
          </div>
        </div>
        <Link href="/admin/orgs" className="text-blue-600 hover:underline">
          Manage Organizations
        </Link>
        <Link href="/admin/plans" className="text-blue-600 hover:underline block">
          Subscription Plans
        </Link>
        <Link href="/admin/subscriptions" className="text-blue-600 hover:underline block">
          Organization Subscriptions
        </Link>
      </div>
    </AppLayout>
  )
}
