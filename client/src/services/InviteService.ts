import { BaseRepository } from '@/repositories/BaseRepository'
import type { ServiceData } from '@/types'
import { Rpc } from '@/types/rpc'

export interface InvitationPayload {
  invitation_id: string
  token: string
  expires_at: string
}

export interface InvitationPreview {
  org_name: string
  org_slug: string
  role: 'admin' | 'member'
  inviter_name: string
  expires_at: string
}

export class InviteService extends BaseRepository {
  /** Admin-only: mint an invitation; returned token MUST be delivered to the invitee. */
  async inviteMember(
    email: string,
    role: 'admin' | 'member' = 'member',
    orgId?: string
  ): ServiceData<InvitationPayload> {
    return this.callRpc<InvitationPayload>(Rpc.Invite.Create, {
      p_email: email,
      p_role: role,
      p_org_id: orgId,
    })
  }

  /** Anonymous-safe: preview before login. Token is the credential. */
  async getInvitationPreview(token: string): ServiceData<InvitationPreview> {
    return this.callRpc<InvitationPreview>(Rpc.Invite.Preview, {
      p_token: token,
    })
  }

  /** Authenticated: email on the invitation must match the logged-in user. */
  async acceptInvitation(token: string): ServiceData<string> {
    return this.callRpc<string>(Rpc.Invite.Accept, { p_token: token })
  }

  async revokeInvitation(invitationId: string): ServiceData<void> {
    return this.callRpc<void>(Rpc.Invite.Revoke, {
      p_invitation_id: invitationId,
    })
  }
}

export const inviteService = new InviteService()
