'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { adminService } from '@/services/AdminService'
import { useSystemAdmin } from '@/hooks/useSystemAdmin'
import { useState, useEffect } from 'react'
import type { SystemStats } from '@/types'
import Link from 'next/link'

export default function AdminPage() {
  const { isSystemAdmin, loading: adminLoading } = useSystemAdmin()
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isSystemAdmin) {
      const load = async () => {
        const { data } = await adminService.getSystemStats()
        if (data) setStats(data)
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

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">System Admin</h1>
        {stats && (
          <div className="grid gap-4 md:grid-cols-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">Organizations</p>
              <p className="text-2xl font-bold">{stats.total_orgs}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">Users</p>
              <p className="text-2xl font-bold">{stats.total_users}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">Members</p>
              <p className="text-2xl font-bold">{stats.total_members}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">Recent Signups</p>
              <p className="text-2xl font-bold">{stats.recent_signups}</p>
            </div>
          </div>
        )}
        <Link href="/admin/orgs" className="text-blue-600 hover:underline">
          Manage Organizations
        </Link>
      </div>
    </AppLayout>
  )
}
