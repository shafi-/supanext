import type { SessionOrganization } from '@/services/OrganizationService'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'

type OrgTab = 'overview' | 'campaigns' | 'members' | 'invites' | 'billing'

interface OrgDetailsViewProps {
  org: SessionOrganization
  isActive: boolean
  isAdmin: boolean
  hasFundraising: boolean
  tab: OrgTab
  onTabChange: (tab: OrgTab) => void
  onActivate: () => void
}

export function OrgDetailsView({
  org,
  isActive,
  isAdmin,
  hasFundraising,
  tab,
  onTabChange,
  onActivate,
}: OrgDetailsViewProps) {
  return (
    <>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{org.name}</h1>
        <StatusBadge status={org.status} />
        {!isActive && org.status === 'active' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => void onActivate()}
            className="h-auto px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 hover:text-blue-700"
          >
            Make active
          </Button>
        )}
      </div>
      {org.status !== 'active' && (
        <p className="text-sm text-gray-500">
          This organization is {org.status}. Most actions are unavailable until it becomes active.
        </p>
      )}
      <div className="flex gap-4 border-b mb-4 overflow-x-auto">
        <button onClick={() => onTabChange('overview')}
          className={`pb-2 whitespace-nowrap ${tab === 'overview' ? 'border-b-2 border-blue-600 font-medium' : ''}`}>
          Overview
        </button>
        {hasFundraising && (
          <button onClick={() => onTabChange('campaigns')}
            className={`pb-2 whitespace-nowrap ${tab === 'campaigns' ? 'border-b-2 border-blue-600 font-medium' : ''}`}>
            Campaigns
          </button>
        )}
        <button onClick={() => onTabChange('members')}
          className={`pb-2 whitespace-nowrap ${tab === 'members' ? 'border-b-2 border-blue-600 font-medium' : ''}`}>
          Members
        </button>
        {isAdmin && (
          <button onClick={() => onTabChange('invites')}
            className={`pb-2 whitespace-nowrap ${tab === 'invites' ? 'border-b-2 border-blue-600 font-medium' : ''}`}>
            Invitations
          </button>
        )}
        <button onClick={() => onTabChange('billing')}
          className={`pb-2 whitespace-nowrap ${tab === 'billing' ? 'border-b-2 border-blue-600 font-medium' : ''}`}>
          Billing
        </button>
      </div>
    </>
  )
}
