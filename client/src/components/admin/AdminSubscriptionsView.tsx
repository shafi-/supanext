import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export interface AdminSubscriptionOrgRow {
  id: string
  name: string
  slug: string
  status: string
}

export interface AdminSubscriptionPlanRow {
  id: string
  name: string
}

interface AdminSubscriptionsViewProps {
  orgs: AdminSubscriptionOrgRow[]
  plans: AdminSubscriptionPlanRow[]
  loading: boolean
  error: string | null
  onAssign: (orgId: string, planId: string) => Promise<void>
  onDeactivate: (orgId: string) => Promise<void>
}

export function AdminSubscriptionsView({
  orgs,
  plans,
  loading,
  error,
  onAssign,
  onDeactivate,
}: AdminSubscriptionsViewProps) {
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<Record<string, string>>({})

  const assign = async (orgId: string) => {
    const planId = selected[orgId]
    if (!planId) return
    setBusy(true)
    await onAssign(orgId, planId)
    setBusy(false)
  }

  const deactivate = async (orgId: string) => {
    setBusy(true)
    await onDeactivate(orgId)
    setBusy(false)
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Organization Subscriptions</h1>
      {error && <p className="text-red-600">{error}</p>}
      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Organization
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Assign Plan
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {orgs.map(org => (
              <tr key={org.id}>
                <td className="whitespace-nowrap px-4 py-3">{org.name}</td>
                <td className="whitespace-nowrap px-4 py-3">{org.status}</td>
                <td className="space-x-2 whitespace-nowrap px-4 py-3">
                  {org.status === 'active' && plans.length > 0 ? (
                    <>
                      <select
                        value={selected[org.id] ?? ''}
                        onChange={e =>
                          setSelected({ ...selected, [org.id]: e.target.value })
                        }
                        className="rounded border px-2 py-1 text-sm"
                      >
                        <option value="">Select plan</option>
                        {plans.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => assign(org.id)}
                        className="h-auto rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        Assign
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => deactivate(org.id)}
                        className="h-auto rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        Deactivate
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link
        href="/admin"
        className="inline-block text-blue-600 hover:underline"
      >
        ← Admin home
      </Link>
    </div>
  )
}
