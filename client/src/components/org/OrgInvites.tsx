import { type InvitationPayload } from '@/services/InviteService'

interface OrgInvitesProps {
  email: string
  role: 'admin' | 'member'
  lastInvite: (InvitationPayload & { email: string }) | null
  error: string | null
  sending: boolean
  onChangeEmail: (value: string) => void
  onChangeRole: (role: 'admin' | 'member') => void
  onInvite: (e: React.FormEvent) => void
}

export function OrgInvites({
  email,
  role,
  lastInvite,
  error,
  sending,
  onChangeEmail,
  onChangeRole,
  onInvite,
}: OrgInvitesProps) {
  return (
    <div className="max-w-2xl space-y-4">
      <form onSubmit={onInvite} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={e => onChangeEmail(e.target.value)}
          placeholder="Invite by email…"
          className="flex-1 rounded-md border px-3 py-2"
        />
        <select
          value={role}
          onChange={e => onChangeRole(e.target.value as 'admin' | 'member')}
          className="rounded border px-2 py-2"
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
        <button
          type="submit"
          disabled={sending}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {sending ? 'Inviting…' : 'Invite'}
        </button>
      </form>
      {error && <p className="text-red-600">{error}</p>}

      {lastInvite && (
        <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-900">
            Invitation created for {lastInvite.email}.
          </p>
          <p className="text-xs text-blue-700">
            Deliver this link yourself — the database never sends emails:
          </p>
          <code className="block break-all rounded border bg-white p-2 text-xs">
            {typeof window !== 'undefined' &&
              `${window.location.origin}/invite?token=${lastInvite.token}`}
          </code>
          <p className="text-xs text-blue-700">
            Expires {new Date(lastInvite.expires_at).toLocaleString()}
          </p>
        </div>
      )}

      <p className="text-sm text-gray-500">
        Pending invitation tracking is not available yet — store the link when
        you mint it.
      </p>
    </div>
  )
}
