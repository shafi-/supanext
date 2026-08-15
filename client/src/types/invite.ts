export interface Invite {
  id: string
  organization_id: string
  email: string
  token: string
  role: string | null
  invited_by: string | null
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export interface InviteValidation {
  invite_id: string
  org_id: string
  org_name: string
  invite_email: string
  invite_role: string
}

export interface CreateInviteDto {
  email: string
  role?: string
}
