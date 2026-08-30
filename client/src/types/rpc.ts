import type { Database } from './database'

/**
 * RPC Function Names
 * Manually maintained, validated against database.ts at compile time.
 *
 * Every function lives in the exposed `api` schema.
 * TypeScript errors if a name doesn't exist in the generated types.
 */
type DbFunction = keyof Database['api']['Functions']

export const Rpc = {
  Session: {
    GetContext: 'get_session_context' satisfies DbFunction,
  },
  Profile: {
    UpdateMyProfile: 'update_my_profile' satisfies DbFunction,
  },
  Subscription: {
    GetMy: 'get_my_subscription' satisfies DbFunction,
    Assign: 'assign_user_subscription' satisfies DbFunction,
    Deactivate: 'deactivate_user_subscription' satisfies DbFunction,
  },
  Plan: {
    Create: 'create_plan' satisfies DbFunction,
    SetFeature: 'set_plan_feature' satisfies DbFunction,
  },
  Campaign: {
    ListMy: 'list_my_campaigns' satisfies DbFunction,
    Create: 'create_campaign' satisfies DbFunction,
    Update: 'update_campaign' satisfies DbFunction,
    Delete: 'delete_campaign' satisfies DbFunction,
  },
  Admin: {
    FindUserByEmail: 'find_user_id_by_email' satisfies DbFunction,
    ListAllUsers: 'list_all_users' satisfies DbFunction,
    ListAllSubscriptions: 'list_all_subscriptions' satisfies DbFunction,
    ListPlans: 'list_plans' satisfies DbFunction,
    ListAuditLog: 'list_audit_log' satisfies DbFunction,
  },
  Invitation: {
    Invite: 'invite_platform_user' satisfies DbFunction,
    Accept: 'accept_platform_invitation' satisfies DbFunction,
    Revoke: 'revoke_platform_invitation' satisfies DbFunction,
    Preview: 'get_platform_invitation_preview' satisfies DbFunction,
  },
  SystemAdmin: {
    Bootstrap: 'bootstrap_system_admin' satisfies DbFunction,
    Grant: 'grant_system_admin' satisfies DbFunction,
    Revoke: 'revoke_system_admin' satisfies DbFunction,
  },
} as const

export type RpcFunction =
  | (typeof Rpc.Session)[keyof typeof Rpc.Session]
  | (typeof Rpc.Profile)[keyof typeof Rpc.Profile]
  | (typeof Rpc.Subscription)[keyof typeof Rpc.Subscription]
  | (typeof Rpc.Plan)[keyof typeof Rpc.Plan]
  | (typeof Rpc.Campaign)[keyof typeof Rpc.Campaign]
  | (typeof Rpc.Admin)[keyof typeof Rpc.Admin]
  | (typeof Rpc.Invitation)[keyof typeof Rpc.Invitation]
  | (typeof Rpc.SystemAdmin)[keyof typeof Rpc.SystemAdmin]
