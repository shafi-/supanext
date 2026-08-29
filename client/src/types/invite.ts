export interface PlatformInvitation {
  id: string
  email: string
  invited_by: string
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export interface InvitationPreview {
  inviter_name: string
  expires_at: string
}

export interface CreateInviteDto {
  email: string
}
