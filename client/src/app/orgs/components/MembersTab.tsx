import { useState, useEffect, useCallback } from 'react'
import { memberService } from '@/services/MemberService'
import { Permission } from '@/types/permissions'

interface MemberRow {
  user_id: string
  email: string
  display_name: string | null
  role: 'admin' | 'member'
  permissions: string[]
}

const GRANTABLE_PERMISSIONS = [
  Permission.FundraisingView,
  Permission.FundraisingCreate,
  Permission.FundraisingUpdate,
  Permission.FundraisingDelete,
]

interface MembersTabProps {
  orgId: string
  isAdmin: boolean
}

export function MembersTab({ orgId, isAdmin }: MembersTabProps) {
  const [members, setMembers] = useState<MemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await memberService.getMembers(orgId)
    if (data) setMembers(data)
    if (err) setError(err)
    setLoading(false)
  }, [orgId])

  useEffect(() => {
    void load()
  }, [load])

  const handleRoleChange = async (userId: string, role: string) => {
    const { error: err } = await memberService.changeMemberRole(userId, role as 'admin' | 'member', orgId)
    if (err) setError(err)
    await load()
  }

  const handleRemove = async (userId: string) => {
    const { error: err } = await memberService.removeMember(userId, orgId)
    if (err) setError(err)
    await load()
  }

  const handlePermission = async (userId: string, permission: string, granted: boolean) => {
    const { error: err } = await memberService.setMemberPermission(userId, permission, granted, orgId)
    if (err) setError(err)
    await load()
  }

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
                  onChange={(e) => handleRoleChange(m.user_id, e.target.value)}
                  className="border rounded px-2 py-1 text-sm">
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                </select>
              ) : (
                <span className="text-sm text-gray-500">{m.role}</span>
              )}
              {isAdmin && m.role !== 'admin' && (
                <button onClick={() => handleRemove(m.user_id)}
                  className="text-red-600 hover:text-red-800 text-sm">Remove</button>
              )}
            </div>
            {isAdmin && m.role === 'member' && (
              <div className="mt-3 flex flex-wrap gap-3 pl-4 border-t pt-3">
                {GRANTABLE_PERMISSIONS.map((perm) => (
                  <label key={perm} className="inline-flex items-center gap-1.5 text-sm">
                    <input type="checkbox"
                      checked={m.permissions.includes(perm)}
                      onChange={(e) => handlePermission(m.user_id, perm, e.target.checked)} />
                    {perm.replace('fundraising.', '')}
                  </label>
                ))}
              </div>
            )}
          </li>
        ))}
        {members.length === 0 && <p className="text-gray-500">No members yet.</p>}
      </ul>
    </div>
  )
}