/**
 * Profile-related type definitions.
 * Single source of truth — service files re-export from here.
 */

export interface UpdatedProfile {
  id: string
  display_name: string | null
  avatar_url: string | null
}
