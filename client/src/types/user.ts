export interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  metadata: Record<string, unknown>
  is_system_admin: boolean
  created_at: string
  updated_at: string
}

export interface UserProfile extends User {}

export interface UpdateProfileDto {
  full_name?: string
  avatar_url?: string
  metadata?: Record<string, unknown>
}
