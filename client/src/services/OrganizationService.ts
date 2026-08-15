import { BaseRepository } from '@/repositories/BaseRepository'
import type { ServiceData, OrganizationView, OrganizationDetailView } from '@/types'
import { Rpc } from '@/types/rpc'

export class OrganizationService extends BaseRepository {
  async createOrganization(
    name: string,
    slug: string,
    description?: string,
    settings?: Record<string, unknown>
  ): ServiceData<OrganizationView> {
    return this.callRpc<OrganizationView>(Rpc.Org.Create, {
      org_name: name,
      org_slug: slug,
      org_description: description,
      org_settings: settings,
    })
  }

  async getMyOrganizations(): ServiceData<OrganizationView[]> {
    return this.callRpc<OrganizationView[]>(Rpc.Org.GetMy)
  }

  async getOrganization(orgId: string): ServiceData<OrganizationDetailView> {
    return this.callRpc<OrganizationDetailView>(Rpc.Org.Get, {
      target_org_id: orgId,
    })
  }

  async getOrgStats(orgId: string): ServiceData<{ member_count: number; todo_count: number; completed_todos: number }> {
    return this.callRpc<{ member_count: number; todo_count: number; completed_todos: number }>(Rpc.Org.GetStats, {
      p_org_id: orgId,
    })
  }

  async updateOrganization(
    orgId: string,
    data: { name?: string; slug?: string; description?: string; settings?: Record<string, unknown> }
  ): ServiceData<OrganizationView> {
    return this.callRpc<OrganizationView>(Rpc.Org.Update, {
      target_org_id: orgId,
      new_name: data.name,
      new_slug: data.slug,
      new_description: data.description,
      new_settings: data.settings,
    })
  }

  async deleteOrganization(orgId: string): ServiceData<boolean> {
    return this.callRpc<boolean>(Rpc.Org.Delete, {
      target_org_id: orgId,
    })
  }
}

export const organizationService = new OrganizationService()
