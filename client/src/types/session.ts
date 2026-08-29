/**
 * Session context returned by get_session_context.
 * User-centric: no organization references.
 */
export interface SessionContext {
  user_id: string
  display_name: string
  is_system_admin: boolean
}
