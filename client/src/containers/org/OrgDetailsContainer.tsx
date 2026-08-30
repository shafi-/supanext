'use client'

import { useState } from 'react'
import { useOrganization } from '@/hooks/useOrganization'
import { useSubscription } from '@/hooks/useSubscription'
import type { SessionOrganization } from '@/services/OrganizationService'
import { OrgDetailsView } from '@/components/org/OrgDetailsView'
import { OverviewTabContainer } from './OverviewTabContainer'
import { CampaignsTabContainer } from './CampaignsTabContainer'
import { MembersTabContainer } from './MembersTabContainer'
import { InvitesTabContainer } from './InvitesTabContainer'
import { BillingTabContainer } from './BillingTabContainer'

type OrgTab = 'overview' | 'campaigns' | 'members' | 'invites' | 'billing'

interface OrgDetailsContainerProps {
  org: SessionOrganization
}

export function OrgDetailsContainer({ org }: OrgDetailsContainerProps) {
  const [tab, setTab] = useState<OrgTab>('overview')
  const { currentOrg, switchOrg, refresh } = useOrganization()
  const { subscription, hasFeature } = useSubscription(org.id)

  const isActive = currentOrg?.id === org.id
  const isAdmin = org.role === 'admin'
  const hasFundraising =
    subscription != null &&
    Object.keys(subscription).length > 0 &&
    hasFeature('fundraising')

  const handleActivate = async () => {
    await switchOrg(org.id)
    await refresh()
  }

  return (
    <>
      <OrgDetailsView
        org={org}
        isActive={isActive}
        isAdmin={isAdmin}
        hasFundraising={hasFundraising}
        tab={tab}
        onTabChange={setTab}
        onActivate={handleActivate}
      />
      {tab === 'overview' && <OverviewTabContainer orgId={org.id} />}
      {tab === 'campaigns' && hasFundraising && (
        <CampaignsTabContainer orgId={org.id} />
      )}
      {tab === 'members' && (
        <MembersTabContainer orgId={org.id} isAdmin={isAdmin} />
      )}
      {tab === 'invites' && isAdmin && <InvitesTabContainer orgId={org.id} />}
      {tab === 'billing' && <BillingTabContainer orgId={org.id} />}
    </>
  )
}
