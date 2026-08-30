import { Button } from '@/components/ui/button'

export interface AdminUserRow {
  id: string
  email: string
  display_name: string | null
  created_at: string
  is_system_admin: boolean
  has_subscription: boolean
}

interface AdminUsersViewProps {
  users: AdminUserRow[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  onLoadMore: () => void
  onGrantAdmin: (id: string) => Promise<void>
  onRevokeAdmin: (id: string) => Promise<void>
}

export function AdminUsersView({
  users,
  loading,
  loadingMore,
  error,
  hasMore,
  onLoadMore,
  onGrantAdmin,
  onRevokeAdmin,
}: AdminUsersViewProps) {
  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">All Users</h1>
      {error && <p className="text-red-600">{error}</p>}
      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Admin
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Subscription
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map(user => (
              <tr key={user.id}>
                <td className="whitespace-nowrap px-4 py-3">{user.email}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  {user.display_name ?? '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {user.is_system_admin ? (
                    <span className="font-medium text-green-600">Yes</span>
                  ) : (
                    <span className="text-gray-400">No</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {user.has_subscription ? (
                    <span className="text-green-600">Active</span>
                  ) : (
                    <span className="text-gray-400">None</span>
                  )}
                </td>
                <td className="space-x-2 whitespace-nowrap px-4 py-3">
                  {!user.is_system_admin ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onGrantAdmin(user.id)}
                      className="h-auto p-0 text-sm text-green-600 hover:bg-transparent hover:text-green-800"
                    >
                      Grant Admin
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRevokeAdmin(user.id)}
                      className="h-auto p-0 text-sm text-red-600 hover:bg-transparent hover:text-red-800"
                    >
                      Revoke Admin
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {hasMore && (
              <tr>
                <td colSpan={5} className="py-4 text-center">
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
