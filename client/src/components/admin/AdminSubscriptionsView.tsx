import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export interface AdminSubscriptionUserRow {
  id: string
  email: string
  display_name: string | null
}

export interface AdminSubscriptionPlanRow {
  id: string
  name: string
}

interface AdminSubscriptionsViewProps {
  users: AdminSubscriptionUserRow[]
  plans: AdminSubscriptionPlanRow[]
  loading: boolean
  error: string | null
  onAssign: (userId: string, planId: string) => Promise<void>
  onDeactivate: (userId: string) => Promise<void>
}

export function AdminSubscriptionsView({
  users,
  plans,
  loading,
  error,
  onAssign,
  onDeactivate,
}: AdminSubscriptionsViewProps) {
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<Record<string, string>>({})

  const assign = async (userId: string) => {
    const planId = selected[userId]
    if (!planId) return
    setBusy(true)
    await onAssign(userId, planId)
    setBusy(false)
  }

  const deactivate = async (userId: string) => {
    setBusy(true)
    await onDeactivate(userId)
    setBusy(false)
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">User Subscriptions</h1>
      {error && <p className="text-red-600">{error}</p>}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assign Plan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3 whitespace-nowrap">
                  {user.email}
                  {user.display_name && (
                    <span className="text-gray-400 ml-2">({user.display_name})</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap space-x-2">
                  {plans.length > 0 ? (
                    <>
                      <select
                        value={selected[user.id] ?? ''}
                        onChange={(e) => setSelected({ ...selected, [user.id]: e.target.value })}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value="">Select plan</option>
                        {plans.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => assign(user.id)}
                        className="h-auto px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                      >
                        Assign
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => deactivate(user.id)}
                        className="h-auto px-2 py-1 border border-red-300 text-red-600 rounded text-xs hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        Deactivate
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400">No plans available</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link href="/admin" className="text-blue-600 hover:underline inline-block">
        ← Admin home
      </Link>
    </div>
  )
}
