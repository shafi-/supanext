'use client'

import { useAuth, useRequireAuth } from '@/hooks/useAuth'
import { useSubscription } from '@/hooks/useSubscription'
import { DashboardView } from '@/components/dashboard/DashboardView'

export function DashboardContainer() {
  const { user } = useRequireAuth()
  const { signOut } = useAuth()
  const { subscription, hasFeature } = useSubscription()

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
      subscription={subscription}
      hasFeature={hasFeature}
      onSignOut={handleSignOut}
    />
  )
}
