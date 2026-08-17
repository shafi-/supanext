import type { Database } from './database'

/**
 * RPC Function Names
 * Manually maintained, validated against database.ts at compile time.
 *
 * Each value must exist in Database['public']['Functions'].
 * TypeScript errors if you add a name that doesn't exist in the generated types.
 */
type DbFunction = keyof Database['public']['Functions']

export const Rpc = {
  Profile: {
    GetMyProfile: 'get_my_profile' satisfies DbFunction,
    GetUserProfile: 'get_user_profile' satisfies DbFunction,
    UpdateMyProfile: 'update_my_profile' satisfies DbFunction,
  },
  Org: {
    Create: 'create_organization' satisfies DbFunction,
    GetMy: 'get_my_organizations' satisfies DbFunction,
    Get: 'get_organization' satisfies DbFunction,
    Update: 'update_organization' satisfies DbFunction,
    Delete: 'delete_organization' satisfies DbFunction,
  },
  Member: {
    Add: 'add_organization_member' satisfies DbFunction,
    Remove: 'remove_organization_member' satisfies DbFunction,
    GetMany: 'get_organization_members' satisfies DbFunction,
    UpdateRole: 'update_member_role' satisfies DbFunction,
    GetMembership: 'get_membership' satisfies DbFunction,
  },
  Todo: {
    Create: 'create_todo' satisfies DbFunction,
    GetMany: 'get_todos' satisfies DbFunction,
    Update: 'update_todo' satisfies DbFunction,
    Delete: 'delete_todo' satisfies DbFunction,
  },
  Invite: {
    Create: 'create_invite' satisfies DbFunction,
    GetMany: 'get_invites' satisfies DbFunction,
    Validate: 'validate_invite' satisfies DbFunction,
    Accept: 'accept_invite' satisfies DbFunction,
    Revoke: 'revoke_invite' satisfies DbFunction,
  },
  Admin: {
    GetStats: 'get_system_stats' satisfies DbFunction,
    GetAllOrgs: 'get_all_organizations' satisfies DbFunction,
    IsSystemAdmin: 'is_system_admin' satisfies DbFunction,
  },
} as const

export type RpcFunction =
  | (typeof Rpc.Profile)[keyof typeof Rpc.Profile]
  | (typeof Rpc.Org)[keyof typeof Rpc.Org]
  | (typeof Rpc.Member)[keyof typeof Rpc.Member]
  | (typeof Rpc.Todo)[keyof typeof Rpc.Todo]
  | (typeof Rpc.Invite)[keyof typeof Rpc.Invite]
  | (typeof Rpc.Admin)[keyof typeof Rpc.Admin]
