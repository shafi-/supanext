import { useState } from 'react'
import { inviteService, type InvitationPayload } from '@/services/InviteService'

interface InvitesTabProps {
  orgId: string
}

export function InvitesTab({ orgId }: InvitesTabProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('member')
  const [lastInvite, setLastInvite] = useState<(InvitationPayload & { email: string }) | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = email.trim()
    if (!val) return
    setSending(true)
    setError(null)
    const { data, error: err } = await inviteService.inviteMember(val, role, orgId)
    setSending(false)
    if (err || !data) {
      setError(err ?? 'Failed to create invitation')
      return
    }
    setLastInvite({ ...data, email: val })
    setEmail('')
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <form onSubmit={handleInvite} className="flex gap-2">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="Invite by email…" className="flex-1 border rounded-md px-3 py-2" />
        <select value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
          className="border rounded px-2 py-2">
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" disabled={sending}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50">
          {sending ? 'Inviting…' : 'Invite'}
        </button>
      </form>
      {error && <p className="text-red-600">{error}</p>}

      {lastInvite && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-2">
          <p className="text-sm font-medium text-blue-900">
            Invitation created for {lastInvite.email}.
          </p>
          <p className="text-xs text-blue-700">
            Deliver this link yourself — the database never sends emails:
          </p>
          <code className="block bg-white p-2 rounded border text-xs break-all">
            {typeof window !== 'undefined' &&
              `${window.location.origin}/invite?token=${lastInvite.token}`}
          </code>
          <p className="text-xs text-blue-700">
            Expires {new Date(lastInvite.expires_at).toLocaleString()}
          </p>
        </div>
      )}

      <p className="text-sm text-gray-500">
        Pending invitation tracking is not available yet — store the link when you mint it.
      </p>
    </div>
  )
}