import { BaseRepository } from '@/repositories/BaseRepository'
import type { ServiceData } from '@/types'
import { Rpc } from '@/types/rpc'

// Re-export from types/organization.ts for backward compatibility
export type {
  SessionOrganization,
  SessionContext,
  OrganizationStatus,
  PublicOrganization,
  OrgStats,
} from '@/types/organization'

import type {
  SessionOrganization,
  SessionContext,
  OrganizationStatus,
  PublicOrganization,
  OrgStats,
} from '@/types/organization'

export class OrganizationService extends BaseRepository {
  /** Request a new organization — creator becomes its admin; starts pending. */
  async requestOrganization(name: string, slug: string): ServiceData<string> {
    return this.callRpc<string>(Rpc.Org.Request, { p_name: name, p_slug: slug })
  }

  async getMyOrganizations(): ServiceData<SessionOrganization[]> {
    return this.callRpc<SessionOrganization[]>(Rpc.Session.GetMyOrgs)
  }

  async getSessionContext(): ServiceData<SessionContext> {
    return this.callRpc<SessionContext>(Rpc.Session.GetContext)
  }

  async setActiveOrganization(orgId: string): ServiceData<{ active_organization_id: string }> {
    return this.callRpc(Rpc.Session.SetActiveOrg, { p_org_id: orgId })
  }

  async getOrganizationStatus(orgId?: string): ServiceData<OrganizationStatus> {
    return this.callRpc<OrganizationStatus>(Rpc.Org.GetStatus, { p_org_id: orgId })
  }

  async getOrgStats(orgId: string): ServiceData<OrgStats> {
    return this.callRpc<OrgStats>(Rpc.Org.GetStats, { p_org_id: orgId })
  }

  /** Anonymous-safe public directory (active + suspended orgs). */
  async listPublicOrganizations(limit = 50): ServiceData<PublicOrganization[]> {
    return this.callRpc<PublicOrganization[]>(Rpc.Org.ListPublic, { p_limit: limit })
  }
}

export const organizationService = new OrganizationService()
