import { BaseRepository } from '@/repositories/BaseRepository'
import type { ServiceData, Invite, InviteValidation } from '@/types'
import { Rpc } from '@/types/rpc'

export class InviteService extends BaseRepository {
  async generateInvite(
    orgId: string,
    email: string,
    role: string = 'member'
  ): ServiceData<Invite> {
    return this.callRpc<Invite>(Rpc.Invite.Create, {
      p_organization_id: orgId,
      p_email: email,
      p_role: role,
    })
  }

  async getInvites(orgId: string): ServiceData<Invite[]> {
    return this.callRpc<Invite[]>(Rpc.Invite.GetMany, {
      p_organization_id: orgId,
    })
  }

  async validateInvite(token: string): ServiceData<InviteValidation[]> {
    return this.callRpc<InviteValidation[]>(Rpc.Invite.Validate, {
      p_token: token,
    })
  }

  async acceptInvite(token: string): ServiceData<boolean> {
    return this.callRpc<boolean>(Rpc.Invite.Accept, {
      p_token: token,
    })
  }

  async revokeInvite(inviteId: string): ServiceData<boolean> {
    return this.callRpc<boolean>(Rpc.Invite.Revoke, {
      p_invite_id: inviteId,
    })
  }
}

export const inviteService = new InviteService()
