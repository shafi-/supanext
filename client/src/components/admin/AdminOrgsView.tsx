import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'

export interface AdminOrgRow {
  id: string
  name: string
  slug: string
  status: string
  suspension_note: string | null
  created_at: string
}

interface AdminOrgsViewProps {
  orgs: AdminOrgRow[]
  loading: boolean
  error: string | null
  onApprove: (id: string) => Promise<void>
  onReject: (id: string) => Promise<void>
  onSuspend: (id: string, note: string) => Promise<void>
  onUnsuspend: (id: string) => Promise<void>
}

export function AdminOrgsView({
  orgs,
  loading,
  error,
  onApprove,
  onReject,
  onSuspend,
  onUnsuspend,
}: AdminOrgsViewProps) {
  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">All Organizations</h1>
      {error && <p className="text-red-600">{error}</p>}
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
                  <StatusBadge status={org.status} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap space-x-2">
                  {org.status === 'pending' && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onApprove(org.id)}
                        className="h-auto p-0 hover:bg-transparent text-green-600 hover:text-green-800 text-sm"
                      >
                        Approve
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onReject(org.id)}
                        className="h-auto p-0 hover:bg-transparent text-gray-600 hover:text-gray-800 text-sm"
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {org.status === 'active' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const note = window.prompt('Suspension note (required):')
                        if (note) void onSuspend(org.id, note)
                      }}
                      className="h-auto p-0 hover:bg-transparent text-red-600 hover:text-red-800 text-sm"
                    >
                      Suspend
                    </Button>
                  )}
                  {org.status === 'suspended' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onUnsuspend(org.id)}
                      className="h-auto p-0 hover:bg-transparent text-green-600 hover:text-green-800 text-sm"
                    >
                      Unsuspend
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
