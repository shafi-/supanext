import type { PublicOrgProfile } from '@/types/organization'
import { StatusBadge } from '@/components/shared/StatusBadge'

export function PublicOrgView({ org }: { org: PublicOrgProfile }) {
  return (
    <div className="mx-auto max-w-4xl py-12">
      <h1 className="text-3xl font-bold text-gray-900">{org.name}</h1>
      <div className="mt-2">
        <StatusBadge status={org.status} />
      </div>
      <dl className="mt-6 space-y-2 text-sm text-gray-600">
        <div>
          <dt className="inline font-medium">Slug: </dt>
          <dd className="inline">{org.slug}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Created: </dt>
          <dd className="inline">
            {new Date(org.created_at).toLocaleDateString()}
          </dd>
        </div>
      </dl>
    </div>
  )
}
