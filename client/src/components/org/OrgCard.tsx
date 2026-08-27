import type { SessionOrganization } from '@/services/OrganizationService'
import { StatusBadge } from '@/components/shared/StatusBadge'

interface OrgCardProps {
  org: SessionOrganization
}

export function OrgCard({ org }: OrgCardProps) {
  return (
    <div className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">{org.name}</h2>
        <StatusBadge status={org.status} />
      </div>
      <p className="text-gray-500 text-xs mt-2">Role: {org.role}</p>
    </div>
  )
}
