import { BaseRepository } from '@/repositories/BaseRepository'
import type { ServiceData, SystemStats, OrganizationDetailView } from '@/types'
import { Rpc } from '@/types/rpc'

export class AdminService extends BaseRepository {
  async isSystemAdmin(): ServiceData<boolean> {
    return this.callRpc<boolean>(Rpc.Admin.IsSystemAdmin)
  }

  async getAllOrgs(): ServiceData<OrganizationDetailView[]> {
    return this.callRpc<OrganizationDetailView[]>(Rpc.Admin.GetAllOrgs)
  }

  async getSystemStats(): ServiceData<SystemStats> {
    return this.callRpc<SystemStats>(Rpc.Admin.GetStats)
  }
}

export const adminService = new AdminService()
