'use client'

import { useAuth, useRequireAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'
import { useOrgStats } from '@/hooks/useOrgStats'
import { useSubscription } from '@/hooks/useSubscription'
import { DashboardView } from '@/components/dashboard/DashboardView'

export function DashboardContainer() {
  const { user } = useRequireAuth()
  const { signOut } = useAuth()
  const { organizations, currentOrg } = useOrganization()
  const { stats } = useOrgStats(currentOrg?.id)
  const { hasFeature } = useSubscription(currentOrg?.id)

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <DashboardView
      user={user}
      currentOrg={currentOrg}
      organizations={organizations}
      stats={stats}
      hasFeature={hasFeature}
      onSignOut={handleSignOut}
    />
  )
}
