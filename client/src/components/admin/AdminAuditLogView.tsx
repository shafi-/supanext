import Loading from '@/components/ui/loading'

export interface AuditLogRow {
  id: string
  occurred_at: string
  actor_user_id: string | null
  actor_email: string
  actor_display_name: string
  organization_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  metadata: Record<string, unknown>
}

interface AdminAuditLogViewProps {
  entries: AuditLogRow[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  onLoadMore: () => void
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function actorLabel(row: AuditLogRow): string {
  if (row.actor_display_name) return row.actor_display_name
  if (row.actor_email) return row.actor_email
  return row.actor_user_id ? row.actor_user_id.slice(0, 8) + '…' : 'system'
}

function metadataPreview(row: AuditLogRow): string {
  const keys = Object.keys(row.metadata ?? {})
  if (keys.length === 0) return ''
  return keys
    .slice(0, 3)
    .map(
      k =>
        `${k}=${JSON.stringify((row.metadata as Record<string, unknown>)[k])}`
    )
    .join(', ')
}

export function AdminAuditLogView({
  entries,
  loading,
  loadingMore,
  error,
  hasMore,
  onLoadMore,
}: AdminAuditLogViewProps) {
  if (loading) return <Loading />

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-sm text-gray-500">
          Most recent platform actions. Newest first.
        </p>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow">
          No audit log entries yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-700">
                  When
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">
                  Actor
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">
                  Action
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">
                  Entity
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">
                  Metadata
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {entries.map(row => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                    {formatTime(row.occurred_at)}
                  </td>
                  <td className="px-3 py-2 text-gray-900">
                    <div className="font-medium">{actorLabel(row)}</div>
                    {row.actor_email && row.actor_display_name && (
                      <div className="text-xs text-gray-500">
                        {row.actor_email}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                      {row.action}
                    </code>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600">
                    {row.entity_type && <div>{row.entity_type}</div>}
                    {row.entity_id && (
                      <div className="font-mono text-gray-400">
                        {row.entity_id}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {metadataPreview(row)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasMore && (
        <div className="text-center">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}
