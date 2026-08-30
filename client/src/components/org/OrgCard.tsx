import type { SessionOrganization } from '@/services/OrganizationService'
import { StatusBadge } from '@/components/shared/StatusBadge'

interface OrgCardProps {
  org: SessionOrganization
}

export function OrgCard({ org }: OrgCardProps) {
  return (
    <div className="block rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{org.name}</h2>
        <StatusBadge status={org.status} />
      </div>
      <p className="mt-2 text-xs text-gray-500">Role: {org.role}</p>
    </div>
  )
}
