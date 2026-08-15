import { BaseRepository } from '@/repositories/BaseRepository'
import type { ServiceData, MemberView, Membership } from '@/types'
import { Rpc } from '@/types/rpc'

export class MemberService extends BaseRepository {
  async getMembers(orgId: string): ServiceData<MemberView[]> {
    return this.callRpc<MemberView[]>(Rpc.Member.GetMany, {
      target_org_id: orgId,
    })
  }

  async addMember(orgId: string, email: string, role: string = 'member'): ServiceData<MemberView> {
    return this.callRpc<MemberView>(Rpc.Member.Add, {
      target_org_id: orgId,
      target_user_email: email,
      member_role: role,
    })
  }

  async removeMember(orgId: string, userId: string): ServiceData<boolean> {
    return this.callRpc<boolean>(Rpc.Member.Remove, {
      target_org_id: orgId,
      target_user_id: userId,
    })
  }

  async updateMemberRole(orgId: string, userId: string, newRole: string): ServiceData<MemberView> {
    return this.callRpc<MemberView>(Rpc.Member.UpdateRole, {
      target_org_id: orgId,
      target_user_id: userId,
      new_role: newRole,
    })
  }

  async getMembership(orgId: string): ServiceData<Membership[]> {
    return this.callRpc<Membership[]>(Rpc.Member.GetMembership, {
      target_org_id: orgId,
    })
  }
}

export const memberService = new MemberService()
