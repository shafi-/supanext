import { BaseRepository } from '@/repositories/BaseRepository'
import type { ServiceData } from '@/types'
import type { PaginationParams } from '@/types/pagination'
import { Rpc } from '@/types/rpc'

export type MemberRow = {
  user_id: string
  email: string
  display_name: string | null
  role: 'admin' | 'member'
  permissions: string[]
}

export class MemberService extends BaseRepository {
  async getMembers(orgId?: string, params?: PaginationParams): ServiceData<MemberRow[]> {
    return this.callRpc<MemberRow[]>(Rpc.Member.GetMany, {
      p_org_id: orgId,
      p_limit: params?.limit ?? 20,
      p_cursor: params?.cursor,
    })
  }

  async changeMemberRole(userId: string, role: 'admin' | 'member', orgId?: string): ServiceData<void> {
    return this.callRpc<void>(Rpc.Member.ChangeRole, {
      p_user_id: userId,
      p_role: role,
      p_org_id: orgId,
    })
  }

  async removeMember(userId: string, orgId?: string): ServiceData<void> {
    return this.callRpc<void>(Rpc.Member.Remove, { p_user_id: userId, p_org_id: orgId })
  }

  async setMemberPermission(
    userId: string,
    permission: string,
    granted: boolean,
    orgId?: string
  ): ServiceData<void> {
    return this.callRpc<void>(Rpc.Member.SetPermission, {
      p_user_id: userId,
      p_permission: permission,
      p_granted: granted,
      p_org_id: orgId,
    })
  }
}

export const memberService = new MemberService()
