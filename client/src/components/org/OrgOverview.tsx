import type { OrganizationStatus } from '@/services/OrganizationService'

interface OrgOverviewProps {
  status: OrganizationStatus | null
}

export function OrgOverview({ status }: OrgOverviewProps) {
  if (!status)
    return <div className="text-sm text-gray-500">Loading status…</div>

  return (
    <div className="max-w-xl space-y-2 rounded-lg bg-white p-6 shadow">
      <p>
        <span className="text-sm text-gray-500">Name:</span> {status.name}
      </p>
      <p>
        <span className="text-sm text-gray-500">Status:</span> {status.status}
      </p>
      {status.suspension_note && (
        <p>
          <span className="text-sm text-gray-500">Note:</span>{' '}
          {status.suspension_note}
        </p>
      )}
    </div>
  )
}
