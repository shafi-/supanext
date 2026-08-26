/**
 * Campaign-related type definitions.
 * Single source of truth — service files re-export from here.
 */

export interface Campaign {
  id: string
  organization_id: string
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
