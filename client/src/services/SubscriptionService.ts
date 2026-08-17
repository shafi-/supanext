import { BaseRepository } from '@/repositories/BaseRepository'
import type {
  ServiceData,
  OrganizationSubscription,
  CurrentSubscription,
  SubscriptionPlan,
} from '@/types'
import { Rpc } from '@/types/rpc'

export class SubscriptionService extends BaseRepository {
  async getPlans(): ServiceData<SubscriptionPlan[]> {
    return this.callRpc<SubscriptionPlan[]>(Rpc.Subscription.GetPlans)
  }

  async getMySubscription(orgId: string): ServiceData<CurrentSubscription> {
    return this.callRpc<CurrentSubscription>(Rpc.Subscription.GetMy, {
      p_org_id: orgId,
    })
  }

  async subscribe(
    orgId: string,
    planId: string,
    billingPeriod: 'monthly' | 'yearly'
  ): ServiceData<OrganizationSubscription> {
    return this.callRpc<OrganizationSubscription>(Rpc.Subscription.Subscribe, {
      p_org_id: orgId,
      p_plan_id: planId,
      p_billing_period: billingPeriod,
    })
  }

  async changePlan(
    orgId: string,
    newPlanId: string,
    billingPeriod: 'monthly' | 'yearly'
  ): ServiceData<OrganizationSubscription> {
    return this.callRpc<OrganizationSubscription>(Rpc.Subscription.ChangePlan, {
      p_org_id: orgId,
      p_new_plan_id: newPlanId,
      p_billing_period: billingPeriod,
    })
  }

  async cancel(orgId: string): ServiceData<boolean> {
    return this.callRpc<boolean>(Rpc.Subscription.Cancel, {
      p_org_id: orgId,
    })
  }

  async hasFeature(orgId: string, feature: string): ServiceData<boolean> {
    return this.callRpc<boolean>(Rpc.Subscription.HasFeature, {
      p_org_id: orgId,
      p_feature: feature,
    })
  }
}

export const subscriptionService = new SubscriptionService()
