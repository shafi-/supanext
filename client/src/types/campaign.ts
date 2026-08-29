/**
 * Campaign-related type definitions.
 * Single source of truth — service files re-export from here.
 * User-centric: campaigns belong to a user, not an organization.
 */

export interface Campaign {
  id: string
  user_id: string
  name: string
  description: string | null
  goal_minor: number | null
  currency: string
  starts_at: string | null
  ends_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}
