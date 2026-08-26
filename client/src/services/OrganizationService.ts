import { BaseRepository } from '@/repositories/BaseRepository'
import type { ServiceData } from '@/types'
import { Rpc } from '@/types/rpc'

export interface SessionOrganization {
  id: string
  name: string
  slug: string
  status: 'pending' | 'active' | 'suspended' | 'rejected'
  role: 'admin' | 'member'
  is_active_selection: boolean
}

export interface SessionContext {
  user_id: string
  display_name: string
  is_system_admin: boolean
  active_organization_id: string | null
  organizations: SessionOrganization[]
}

export interface OrganizationStatus {
  id: string
  name: string
  status: string
  suspension_note: string | null
}

export interface PublicOrganization {
  name: string
  slug: string
  status: 'active' | 'suspended'
  member_count: number
  campaign_count: number
  created_at: string
}

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

  async getOrganizationStatus(): ServiceData<OrganizationStatus> {
    return this.callRpc<OrganizationStatus>(Rpc.Org.GetStatus)
  }

  /** Anonymous-safe public directory (active + suspended orgs). */
  async listPublicOrganizations(limit = 50): ServiceData<PublicOrganization[]> {
    return this.callRpc<PublicOrganization[]>(Rpc.Org.ListPublic, { p_limit: limit })
  }
}

export const organizationService = new OrganizationService()
