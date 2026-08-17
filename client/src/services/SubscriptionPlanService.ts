import { BaseRepository } from '@/repositories/BaseRepository'
import type {
  ServiceData,
  SubscriptionPlan,
  OrganizationSubscriptionView,
  SubscriptionHistoryView,
} from '@/types'
import { Rpc } from '@/types/rpc'

export class SubscriptionPlanService extends BaseRepository {
  async getPlans(): ServiceData<SubscriptionPlan[]> {
    return this.callRpc<SubscriptionPlan[]>(Rpc.Subscription.GetPlans)
  }

  async createPlan(
    name: string,
    description: string,
    priceMonthly: number,
    priceYearly: number,
    features: string[]
  ): ServiceData<SubscriptionPlan> {
    return this.callRpc<SubscriptionPlan>(Rpc.Subscription.CreatePlan, {
      p_name: name,
      p_description: description,
      p_price_monthly: priceMonthly,
      p_price_yearly: priceYearly,
      p_features: JSON.stringify(features),
    })
  }

  async updatePlan(
    planId: string,
    data: {
      name?: string
      description?: string
      price_monthly?: number
      price_yearly?: number
      features?: string[]
      is_active?: boolean
    }
  ): ServiceData<SubscriptionPlan> {
    return this.callRpc<SubscriptionPlan>(Rpc.Subscription.UpdatePlan, {
      p_plan_id: planId,
      p_name: data.name ?? null,
      p_description: data.description ?? null,
      p_price_monthly: data.price_monthly ?? null,
      p_price_yearly: data.price_yearly ?? null,
      p_features: data.features ? JSON.stringify(data.features) : null,
      p_is_active: data.is_active ?? null,
    })
  }

  async getOrgSubscriptions(): ServiceData<OrganizationSubscriptionView[]> {
    return this.callRpc<OrganizationSubscriptionView[]>(Rpc.Subscription.GetOrgSubscriptions)
  }

  async getHistory(orgId: string): ServiceData<SubscriptionHistoryView[]> {
    return this.callRpc<SubscriptionHistoryView[]>(Rpc.Subscription.GetHistory, {
      p_org_id: orgId,
    })
  }

  async pauseSubscription(orgId: string): ServiceData<boolean> {
    return this.callRpc<boolean>(Rpc.Subscription.Pause, {
      p_org_id: orgId,
    })
  }

  async unpauseSubscription(orgId: string): ServiceData<boolean> {
    return this.callRpc<boolean>(Rpc.Subscription.Unpause, {
      p_org_id: orgId,
    })
  }
}

export const subscriptionPlanService = new SubscriptionPlanService()
