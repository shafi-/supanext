import Link from 'next/link'
import { useState } from 'react'

interface AdminDashboardViewProps {
  userCount: number
  subscriptionCount: number
  onRunSysAdmin: (
    op: 'grant' | 'revoke',
    email: string
  ) => Promise<string | null>
}

export function AdminDashboardView({
  userCount,
  subscriptionCount,
  onRunSysAdmin,
}: AdminDashboardViewProps) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">System Admin</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-sm text-gray-500">Total Users</p>
          <p className="text-2xl font-bold">{userCount}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-sm text-gray-500">Active Subscriptions</p>
          <p className="text-2xl font-bold">{subscriptionCount}</p>
        </div>
      </div>
      <Link href="/admin/users" className="text-blue-600 hover:underline">
        Manage Users
      </Link>
      <Link href="/admin/plans" className="block text-blue-600 hover:underline">
        Subscription Plans
      </Link>
      <Link
        href="/admin/subscriptions"
        className="block text-blue-600 hover:underline"
      >
        User Subscriptions
      </Link>
      <Link href="/admin/audit" className="block text-blue-600 hover:underline">
        Audit Log
      </Link>
      <SystemAdminCard onRunSysAdmin={onRunSysAdmin} />
    </div>
  )
}

function SystemAdminCard({
  onRunSysAdmin,
}: {
  onRunSysAdmin: (
    op: 'grant' | 'revoke',
    email: string
  ) => Promise<string | null>
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
    <div className="max-w-xl space-y-3 rounded-lg bg-white p-6 shadow">
      <h2 className="font-semibold">System Administrators</h2>
      <p className="text-xs text-gray-500">
        Grant or revoke platform administration by email. The last admin cannot
        be revoked.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="user@example.com"
          disabled={busy}
          className="flex-1 rounded-md border px-3 py-1.5 text-sm"
        />
        <button
          disabled={busy || !email.trim()}
          onClick={() => run('grant')}
          className="rounded-md bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:opacity-50"
        >
          Grant
        </button>
        <button
          disabled={busy || !email.trim()}
          onClick={() => run('revoke')}
          className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          Revoke
        </button>
      </div>
    </div>
  )
}
