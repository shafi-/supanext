import Link from 'next/link'
import { useState } from 'react'

export interface AdminOrgRow {
  id: string
  name: string
  slug: string
  status: string
  suspension_note: string | null
  created_at: string
}

interface AdminDashboardViewProps {
  pending: number
  active: number
  suspended: number
  onRunSysAdmin: (op: 'grant' | 'revoke', email: string) => Promise<string | null>
}

export function AdminDashboardView({
  pending,
  active,
  suspended,
  onRunSysAdmin,
}: AdminDashboardViewProps) {
  return (
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
      <SystemAdminCard onRunSysAdmin={onRunSysAdmin} />
    </div>
  )
}

function SystemAdminCard({
  onRunSysAdmin,
}: {
  onRunSysAdmin: (op: 'grant' | 'revoke', email: string) => Promise<string | null>
}) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async (op: 'grant' | 'revoke') => {
    setBusy(true)
    setError(null)
    const err = await onRunSysAdmin(op, email.trim())
    if (err) setError(err)
    else setEmail('')
    setBusy(false)
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow space-y-3 max-w-xl">
      <h2 className="font-semibold">System Administrators</h2>
      <p className="text-xs text-gray-500">
        Grant or revoke platform administration by email. The last admin cannot be revoked.
      </p>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          disabled={busy}
          className="flex-1 border rounded-md px-3 py-1.5 text-sm"
        />
        <button
          disabled={busy || !email.trim()}
          onClick={() => run('grant')}
          className="px-3 py-1.5 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
        >
          Grant
        </button>
        <button
          disabled={busy || !email.trim()}
          onClick={() => run('revoke')}
          className="px-3 py-1.5 border border-red-300 text-red-600 rounded-md text-sm hover:bg-red-50 disabled:opacity-50"
        >
          Revoke
        </button>
      </div>
    </div>
  )
}
