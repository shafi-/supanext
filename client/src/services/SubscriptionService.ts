import { BaseRepository } from '@/repositories/BaseRepository'
import type { ServiceData } from '@/types'
import { Rpc } from '@/types/rpc'

// Re-export from types/subscription.ts for backward compatibility
// (CurrentSubscription is defined here, not in the dead types/subscription.ts)
export interface CurrentSubscription {
  id?: string
  plan_id?: string
  plan_code?: string
  plan_name?: string
  status?: 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired'
  starts_at?: string
  ends_at?: string
  features: string[]
}

/** Read-only for members. Assignment/deactivation lives in AdminService (system-admin only). */
export class SubscriptionService extends BaseRepository {
  async getCurrentSubscription(orgId?: string): ServiceData<CurrentSubscription> {
    return this.callRpc<CurrentSubscription>(Rpc.Subscription.GetCurrent, { p_org_id: orgId })
  }
}

export const subscriptionService = new SubscriptionService()
