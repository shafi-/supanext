import { Permission } from '@/types/permissions'
import { Button } from '@/components/ui/button'

export interface MemberRow {
  user_id: string
  email: string
  display_name: string | null
  role: 'admin' | 'member'
  permissions: string[]
}

interface OrgMembersProps {
  members: MemberRow[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  onLoadMore: () => void
  isAdmin: boolean
  grantablePermissions: Permission[]
  onRoleChange: (userId: string, role: string) => void
  onRemove: (userId: string) => void
  onPermission: (userId: string, permission: string, granted: boolean) => void
}

export function OrgMembers({
  members,
  loading,
  loadingMore,
  error,
  hasMore,
  onLoadMore,
  isAdmin,
  grantablePermissions,
  onRoleChange,
  onRemove,
  onPermission,
}: OrgMembersProps) {
  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-4">
      {error && <p className="text-red-600">{error}</p>}
      <ul className="space-y-2">
        {members.map((m) => (
          <li key={m.user_id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="font-medium">{m.display_name ?? m.email}</p>
                <p className="text-sm text-gray-500">{m.email}</p>
              </div>
              {isAdmin ? (
                <select value={m.role}
                  onChange={(e) => onRoleChange(m.user_id, e.target.value)}
                  className="border rounded px-2 py-1 text-sm">
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                </select>
              ) : (
                <span className="text-sm text-gray-500">{m.role}</span>
              )}
              {isAdmin && m.role !== 'admin' && (
                <button onClick={() => onRemove(m.user_id)}
                  className="text-red-600 hover:text-red-800 text-sm">Remove</button>
              )}
            </div>
            {isAdmin && m.role === 'member' && (
              <div className="mt-3 flex flex-wrap gap-3 pl-4 border-t pt-3">
                {grantablePermissions.map((perm) => (
                  <label key={perm} className="inline-flex items-center gap-1.5 text-sm">
                    <input type="checkbox"
                      checked={m.permissions.includes(perm)}
                      onChange={(e) => onPermission(m.user_id, perm, e.target.checked)} />
                    {perm.replace('fundraising.', '')}
                  </label>
                ))}
              </div>
            )}
          </li>
        ))}
        {hasMore && (
          <li className="text-center py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onLoadMore}
              disabled={loadingMore}
              className="text-blue-600 hover:text-blue-800"
            >
              {loadingMore ? 'Loading...' : 'Load More'}
            </Button>
          </li>
        )}
        {members.length === 0 && <p className="text-gray-500">No members yet.</p>}
      </ul>
    </div>
  )
}
