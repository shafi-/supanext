import { BaseRepository } from '@/repositories/BaseRepository'
import type { ServiceData } from '@/types'
import { Rpc } from '@/types/rpc'

export interface InvitationPayload {
  invitation_id: string
  token: string
  expires_at: string
}

export interface InvitationPreview {
  inviter_name: string
  expires_at: string
}

export class InviteService extends BaseRepository {
  /** Admin-only: mint a platform invitation; returned token MUST be delivered to the invitee. */
  async inviteUser(email: string): ServiceData<InvitationPayload> {
    return this.callRpc<InvitationPayload>(Rpc.Invitation.Invite, {
      p_email: email,
    })
  }

  /** Anonymous-safe: preview before login. Token is the credential. */
  async getInvitationPreview(token: string): ServiceData<InvitationPreview> {
    return this.callRpc<InvitationPreview>(Rpc.Invitation.Preview, {
      p_token: token,
    })
  }

  /** Authenticated: accept platform invitation. */
  async acceptInvitation(token: string): ServiceData<boolean> {
    return this.callRpc<boolean>(Rpc.Invitation.Accept, { p_token: token })
  }

  async revokeInvitation(invitationId: string): ServiceData<void> {
    return this.callRpc<void>(Rpc.Invitation.Revoke, {
      p_invitation_id: invitationId,
    })
  }
}

export const inviteService = new InviteService()
