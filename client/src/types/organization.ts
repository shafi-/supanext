/**
 * Organization-related type definitions.
 * Single source of truth — service files re-export from here.
 */

export interface SessionOrganization {
  id: string
  name: string
  slug: string
  status: 'pending' | 'active' | 'suspended' | 'rejected'
  role: 'admin' | 'member'
  is_active_selection: boolean
}

export interface SessionContext {
  user_id: string
  display_name: string
  is_system_admin: boolean
  active_organization_id: string | null
  organizations: SessionOrganization[]
}

export interface OrganizationStatus {
  id: string
  name: string
  status: string
  suspension_note: string | null
}

export interface PublicOrganization {
  name: string
  slug: string
  status: 'active' | 'suspended'
  member_count: number
  campaign_count: number
  created_at: string
}

export interface OrgStats {
  member_count: number
  campaign_count: number
}

export interface PublicOrgProfile {
  id: string
  name: string
  slug: string
  status: 'pending' | 'active'
  created_at: string
}
