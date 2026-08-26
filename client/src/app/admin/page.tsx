'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { adminService } from '@/services/AdminService'
import { useSystemAdmin } from '@/hooks/useSystemAdmin'
import { useState, useEffect, useCallback } from 'react'
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

  const refresh = useCallback(async () => {
    const { data } = await adminService.listAllOrganizations()
    if (data) setOrgs(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isSystemAdmin) void refresh()
  }, [isSystemAdmin, refresh])

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
        <SystemAdminCard onChanged={refresh} />
      </div>
    </AppLayout>
  )
}

function SystemAdminCard({ onChanged }: { onChanged: () => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async (op: (userId: string) => Promise<{ error: string | null }>) => {
    setBusy(true)
    setError(null)
    const lookup = await adminService.findUserIdByEmail(email.trim())
    if (!lookup.data) {
      setError(lookup.error ?? 'No user found with that email')
      setBusy(false)
      return
    }
    const { error: err } = await op(lookup.data)
    if (err) setError(err)
    setEmail('')
    setBusy(false)
    await onChanged()
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow space-y-3 max-w-xl">
      <h2 className="font-semibold">System Administrators</h2>
      <p className="text-xs text-gray-500">
        Grant or revoke platform administration by email. The last admin cannot be revoked.
      </p>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="flex gap-2">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com" disabled={busy}
          className="flex-1 border rounded-md px-3 py-1.5 text-sm" />
        <button disabled={busy || !email.trim()}
          onClick={() => run((uid) => adminService.grantSystemAdmin(uid))}
          className="px-3 py-1.5 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50">
          Grant
        </button>
        <button disabled={busy || !email.trim()}
          onClick={() => run((uid) => adminService.revokeSystemAdmin(uid))}
          className="px-3 py-1.5 border border-red-300 text-red-600 rounded-md text-sm hover:bg-red-50 disabled:opacity-50">
          Revoke
        </button>
      </div>
    </div>
  )
}
