import { BaseRepository } from '@/repositories/BaseRepository'
import type { ServiceData } from '@/types'
import type { PaginationParams } from '@/types/pagination'
import { Rpc } from '@/types/rpc'

export type AdminOrgRow = { id: string; name: string; slug: string; status: string; suspension_note: string | null; created_at: string }

export type AdminPlanRow = {
  id: string; code: string; name: string; description: string | null;
  price_minor: number; currency: string; billing_interval: string;
  is_active: boolean; features: string[]
}

export type AuditLogRow = {
  id: string
  occurred_at: string
  actor_user_id: string | null
  actor_email: string
  actor_display_name: string
  organization_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  metadata: Record<string, unknown>
}

/**
 * System-administration operations.
 * Every method here requires the caller to be a system admin server-side;
 * the database rejects everyone else regardless of UI.
 */
export class AdminService extends BaseRepository {
  // -- organization lifecycle -------------------------------------------------
  async approveOrganization(orgId: string): ServiceData<void> {
    return this.callRpc<void>(Rpc.Org.Approve, { p_org_id: orgId })
  }

  async rejectOrganization(orgId: string, note?: string): ServiceData<void> {
    return this.callRpc<void>(Rpc.Org.Reject, { p_org_id: orgId, p_note: note })
  }

  async suspendOrganization(orgId: string, note: string): ServiceData<void> {
    return this.callRpc<void>(Rpc.Org.Suspend, { p_org_id: orgId, p_note: note })
  }

  async unsuspendOrganization(orgId: string): ServiceData<void> {
    return this.callRpc<void>(Rpc.Org.Unsuspend, { p_org_id: orgId })
  }

  // -- system admin management ------------------------------------------------
  async grantSystemAdmin(userId: string): ServiceData<void> {
    return this.callRpc<void>(Rpc.SystemAdmin.Grant, { p_user_id: userId })
  }

  async revokeSystemAdmin(userId: string): ServiceData<void> {
    return this.callRpc<void>(Rpc.SystemAdmin.Revoke, { p_user_id: userId })
  }

  /** Resolves a user id from email; null when unknown. Sysadmin-only. */
  async findUserIdByEmail(email: string): ServiceData<string | null> {
    return this.callRpc<string | null>(Rpc.Admin.FindUserByEmail, { p_email: email })
  }

  // -- console listings ---------------------------------------------------------
  async listAllOrganizations(params?: PaginationParams): ServiceData<AdminOrgRow[]> {
    return this.callRpc<AdminOrgRow[]>(Rpc.Admin.ListAllOrgs, {
      p_limit: params?.limit ?? 20,
      p_cursor: params?.cursor,
    })
  }

  async listPlans(params?: PaginationParams): ServiceData<AdminPlanRow[]> {
    return this.callRpc<AdminPlanRow[]>(Rpc.Admin.ListPlans, {
      p_limit: params?.limit ?? 20,
      p_cursor: params?.cursor,
    })
  }

  async listAuditLog(params?: PaginationParams): ServiceData<AuditLogRow[]> {
    return this.callRpc<AuditLogRow[]>(Rpc.Admin.ListAuditLog, {
      p_limit: params?.limit ?? 50,
      p_cursor: params?.cursor,
    })
  }

  // -- plans & subscriptions (system-administered only) ------------------------
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

  async assignSubscription(
    orgId: string,
    planId: string,
    status: 'trialing' | 'active' | 'past_due' = 'active',
    startsAt?: string,
    endsAt?: string
  ): ServiceData<string> {
    return this.callRpc<string>(Rpc.Subscription.Assign, {
      p_org_id: orgId,
      p_plan_id: planId,
      p_status: status,
      p_starts_at: startsAt,
      p_ends_at: endsAt,
    })
  }

  async deactivateSubscription(orgId: string): ServiceData<void> {
    return this.callRpc<void>(Rpc.Subscription.Deactivate, { p_org_id: orgId })
  }
}

export const adminService = new AdminService()
