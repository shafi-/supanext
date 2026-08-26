import Link from 'next/link'
import { SessionOrganization } from '@/services/OrganizationService'
import { OrgCard } from './OrgCard'

interface OrgListProps {
  organizations: SessionOrganization[]
  loading: boolean
}

export function OrgList({ organizations, loading }: OrgListProps) {
  return (
    <>
      <h1 className="text-2xl font-bold">Organizations</h1>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => (
            <Link key={org.id} href={`/orgs?id=${org.id}`}>
              <OrgCard org={org} />
            </Link>
          ))}
          {organizations.length === 0 && (
            <p className="text-gray-500 col-span-full">No organizations yet.</p>
          )}
        </div>
      )}
    </>
  )
}