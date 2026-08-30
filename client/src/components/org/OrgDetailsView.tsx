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
            className="h-auto rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-100 hover:text-blue-700"
          >
            Make active
          </Button>
        )}
      </div>
      {org.status !== 'active' && (
        <p className="text-sm text-gray-500">
          This organization is {org.status}. Most actions are unavailable until
          it becomes active.
        </p>
      )}
      <div className="mb-4 flex gap-4 overflow-x-auto border-b">
        <button
          onClick={() => onTabChange('overview')}
          className={`whitespace-nowrap pb-2 ${tab === 'overview' ? 'border-b-2 border-blue-600 font-medium' : ''}`}
        >
          Overview
        </button>
        {hasFundraising && (
          <button
            onClick={() => onTabChange('campaigns')}
            className={`whitespace-nowrap pb-2 ${tab === 'campaigns' ? 'border-b-2 border-blue-600 font-medium' : ''}`}
          >
            Campaigns
          </button>
        )}
        <button
          onClick={() => onTabChange('members')}
          className={`whitespace-nowrap pb-2 ${tab === 'members' ? 'border-b-2 border-blue-600 font-medium' : ''}`}
        >
          Members
        </button>
        {isAdmin && (
          <button
            onClick={() => onTabChange('invites')}
            className={`whitespace-nowrap pb-2 ${tab === 'invites' ? 'border-b-2 border-blue-600 font-medium' : ''}`}
          >
            Invitations
          </button>
        )}
        <button
          onClick={() => onTabChange('billing')}
          className={`whitespace-nowrap pb-2 ${tab === 'billing' ? 'border-b-2 border-blue-600 font-medium' : ''}`}
        >
          Billing
        </button>
      </div>
    </>
  )
}
