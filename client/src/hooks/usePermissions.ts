'use client'

import { useSubscription } from './useSubscription'
import { useSystemAdmin } from './useSystemAdmin'

/**
 * Client-side permission gating.
 * User-centric: permissions are based on subscription features and system admin status.
 */
export function usePermissions() {
  const { subscription, hasFeature } = useSubscription()
  const { isSystemAdmin } = useSystemAdmin()

  return {
    isSystemAdmin,
    hasFeature,
    subscription,
  }
}
