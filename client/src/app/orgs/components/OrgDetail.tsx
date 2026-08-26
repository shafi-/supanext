import { SessionOrganization } from '@/services/OrganizationService'
import { StatusBadge } from './StatusBadge'
import { OverviewTab } from './OverviewTab'
import { CampaignsTab } from './CampaignsTab'
import { MembersTab } from './MembersTab'
import { InvitesTab } from './InvitesTab'
import { BillingReadonly } from './BillingReadonly'

type Tab = 'overview' | 'campaigns' | 'members' | 'invites' | 'billing'

interface OrgDetailProps {
  org: SessionOrganization
  isActive: boolean
  isAdmin: boolean
  hasFundraising: boolean
  tab: Tab
  onTabChange: (tab: Tab) => void
  onActivate: () => void
}

export function OrgDetail({
  org,
  isActive,
  isAdmin,
  hasFundraising,
  tab,
  onTabChange,
  onActivate,
}: OrgDetailProps) {
  return (
    <>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{org.name}</h1>
        <StatusBadge status={org.status} />
        {!isActive && org.status === 'active' && (
          <button onClick={() => void onActivate()}
            className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100">
            Make active
          </button>
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
      {tab === 'overview' && <OverviewTab orgId={org.id} />}
      {tab === 'campaigns' && hasFundraising && <CampaignsTab orgId={org.id} />}
      {tab === 'members' && <MembersTab orgId={org.id} isAdmin={isAdmin} />}
      {tab === 'invites' && isAdmin && <InvitesTab orgId={org.id} />}
      {tab === 'billing' && <BillingReadonly orgId={org.id} />}
    </>
  )
}