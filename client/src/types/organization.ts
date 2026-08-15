export interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  description: string | null
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface OrganizationView extends Organization {
  user_id: string
  user_role: string
  membership_status: string
  joined_at: string
}

export interface OrganizationDetailView extends Organization {
  member_count: number
}

export interface CreateOrganizationDto {
  name: string
  slug: string
  description?: string
  settings?: Record<string, unknown>
}

export interface UpdateOrganizationDto {
  name?: string
  slug?: string
  description?: string
  settings?: Record<string, unknown>
}
