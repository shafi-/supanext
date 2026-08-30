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
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  onLoadMore: () => void
  onApprove: (id: string) => Promise<void>
  onReject: (id: string) => Promise<void>
  onSuspend: (id: string, note: string) => Promise<void>
  onUnsuspend: (id: string) => Promise<void>
}

export function AdminOrgsView({
  orgs,
  loading,
  loadingMore,
  error,
  hasMore,
  onLoadMore,
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
      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Slug
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {orgs.map(org => (
              <tr key={org.id}>
                <td className="whitespace-nowrap px-4 py-3">
                  {org.name}
                  {org.suspension_note && (
                    <span
                      className="block text-xs text-red-500"
                      title={org.suspension_note}
                    >
                      {org.suspension_note}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3">{org.slug}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <StatusBadge status={org.status} />
                </td>
                <td className="space-x-2 whitespace-nowrap px-4 py-3">
                  {org.status === 'pending' && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onApprove(org.id)}
                        className="h-auto p-0 text-sm text-green-600 hover:bg-transparent hover:text-green-800"
                      >
                        Approve
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onReject(org.id)}
                        className="h-auto p-0 text-sm text-gray-600 hover:bg-transparent hover:text-gray-800"
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
                        const note = window.prompt(
                          'Suspension note (required):'
                        )
                        if (note) void onSuspend(org.id, note)
                      }}
                      className="h-auto p-0 text-sm text-red-600 hover:bg-transparent hover:text-red-800"
                    >
                      Suspend
                    </Button>
                  )}
                  {org.status === 'suspended' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onUnsuspend(org.id)}
                      className="h-auto p-0 text-sm text-green-600 hover:bg-transparent hover:text-green-800"
                    >
                      Unsuspend
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {hasMore && (
              <tr>
                <td colSpan={4} className="py-4 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onLoadMore}
                    disabled={loadingMore}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {loadingMore ? 'Loading...' : 'Load More'}
                  </Button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
