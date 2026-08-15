export interface Member {
  id: string
  organization_id: string
  user_id: string
  role: string
  status: string
  invited_by: string | null
  joined_at: string
  created_at: string
  updated_at: string
}

export interface MemberView extends Member {
  email: string
  full_name: string | null
  avatar_url: string | null
}

export interface Membership {
  role: string
  permissions: string[]
  is_active: boolean
}
