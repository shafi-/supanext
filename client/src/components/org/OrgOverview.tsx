import type { OrganizationStatus } from '@/services/OrganizationService'

interface OrgOverviewProps {
  status: OrganizationStatus | null
}

export function OrgOverview({ status }: OrgOverviewProps) {
  if (!status) return <div className="text-gray-500 text-sm">Loading status…</div>

  return (
    <div className="bg-white p-6 rounded-lg shadow space-y-2 max-w-xl">
      <p><span className="text-gray-500 text-sm">Name:</span> {status.name}</p>
      <p><span className="text-gray-500 text-sm">Status:</span> {status.status}</p>
      {status.suspension_note && (
        <p><span className="text-gray-500 text-sm">Note:</span> {status.suspension_note}</p>
      )}
    </div>
  )
}
