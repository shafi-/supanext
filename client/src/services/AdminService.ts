import { BaseRepository } from '@/repositories/BaseRepository'
import type { ServiceData } from '@/types'
import type { PaginationParams } from '@/types/pagination'
import { Rpc } from '@/types/rpc'

export type AdminUserRow = {
  id: string
  email: string
  display_name: string | null
  created_at: string
  is_system_admin: boolean
  has_subscription: boolean
}

export type AdminSubscriptionRow = {
  id: string
  user_id: string
  email: string
  display_name: string | null
  plan_id: string
  plan_code: string
  plan_name: string
  status: string
  starts_at: string
  ends_at: string | null
}

export type AdminPlanRow = {
  id: string
  code: string
  name: string
  description: string | null
  price_minor: number
  currency: string
  billing_interval: string
  is_active: boolean
  features: string[]
}

export class AdminService extends BaseRepository {
  // -- user management --------------------------------------------------------
  async listAllUsers(params?: PaginationParams): ServiceData<AdminUserRow[]> {
    return this.callRpc<AdminUserRow[]>(Rpc.Admin.ListAllUsers, {
      p_limit: params?.limit ?? 20,
      p_cursor: params?.cursor,
    })
  }

  async grantSystemAdmin(userId: string): ServiceData<void> {
    return this.callRpc<void>(Rpc.SystemAdmin.Grant, { p_user_id: userId })
  }

  async revokeSystemAdmin(userId: string): ServiceData<void> {
    return this.callRpc<void>(Rpc.SystemAdmin.Revoke, { p_user_id: userId })
  }

  async findUserIdByEmail(email: string): ServiceData<string | null> {
    return this.callRpc<string | null>(Rpc.Admin.FindUserByEmail, { p_email: email })
  }

  // -- subscription management -------------------------------------------------
  async listAllSubscriptions(params?: PaginationParams): ServiceData<AdminSubscriptionRow[]> {
    return this.callRpc<AdminSubscriptionRow[]>(Rpc.Admin.ListAllSubscriptions, {
      p_limit: params?.limit ?? 20,
      p_cursor: params?.cursor,
    })
  }

  async assignSubscription(
    userId: string,
    planId: string,
    status: 'trialing' | 'active' | 'past_due' = 'active',
    startsAt?: string,
    endsAt?: string
  ): ServiceData<string> {
    return this.callRpc<string>(Rpc.Subscription.Assign, {
      p_user_id: userId,
      p_plan_id: planId,
      p_status: status,
      p_starts_at: startsAt,
      p_ends_at: endsAt,
    })
  }

  async deactivateSubscription(userId: string): ServiceData<void> {
    return this.callRpc<void>(Rpc.Subscription.Deactivate, { p_user_id: userId })
  }

  // -- plan management ---------------------------------------------------------
  async listPlans(params?: PaginationParams): ServiceData<AdminPlanRow[]> {
    return this.callRpc<AdminPlanRow[]>(Rpc.Admin.ListPlans, {
      p_limit: params?.limit ?? 20,
      p_cursor: params?.cursor,
    })
  }

  async createPlan(input: {
    code: string
    name: string
    description?: string
    priceMinor: number
    currency: string
    billingInterval: 'month' | 'year' | 'one_time'
  }): ServiceData<string> {
    return this.callRpc<string>(Rpc.Plan.Create, {
      p_code: input.code,
      p_name: input.name,
      p_description: input.description,
      p_price_minor: input.priceMinor,
      p_currency: input.currency,
      p_billing_interval: input.billingInterval,
    })
  }

  async setPlanFeature(planId: string, featureCode: string, enabled: boolean): ServiceData<void> {
    return this.callRpc<void>(Rpc.Plan.SetFeature, {
      p_plan_id: planId,
      p_feature_code: featureCode,
      p_enabled: enabled,
    })
  }
}

export const adminService = new AdminService()
