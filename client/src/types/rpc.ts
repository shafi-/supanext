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
    SetActiveOrg: 'set_active_organization' satisfies DbFunction,
    GetMyOrgs: 'get_my_organizations' satisfies DbFunction,
  },
  Profile: {
    UpdateMyProfile: 'update_my_profile' satisfies DbFunction,
  },
  Org: {
    Request: 'request_organization' satisfies DbFunction,
    Approve: 'approve_organization' satisfies DbFunction,
    Reject: 'reject_organization' satisfies DbFunction,
    Suspend: 'suspend_organization' satisfies DbFunction,
    Unsuspend: 'unsuspend_organization' satisfies DbFunction,
    GetStatus: 'get_organization_status' satisfies DbFunction,
    ListPublic: 'list_public_organizations' satisfies DbFunction,
  },
  Member: {
    GetMany: 'get_organization_members' satisfies DbFunction,
    ChangeRole: 'change_member_role' satisfies DbFunction,
    Remove: 'remove_member' satisfies DbFunction,
    SetPermission: 'set_member_permission' satisfies DbFunction,
  },
  Invite: {
    Create: 'invite_member' satisfies DbFunction,
    Accept: 'accept_invitation' satisfies DbFunction,
    Revoke: 'revoke_invitation' satisfies DbFunction,
    Preview: 'get_invitation_preview' satisfies DbFunction,
  },
  Subscription: {
    GetCurrent: 'get_current_subscription' satisfies DbFunction,
    Assign: 'assign_subscription' satisfies DbFunction,
    Deactivate: 'deactivate_subscription' satisfies DbFunction,
  },
  Plan: {
    Create: 'create_plan' satisfies DbFunction,
    SetFeature: 'set_plan_feature' satisfies DbFunction,
  },
  Campaign: {
    List: 'list_campaigns' satisfies DbFunction,
    Create: 'create_campaign' satisfies DbFunction,
    Update: 'update_campaign' satisfies DbFunction,
    Delete: 'delete_campaign' satisfies DbFunction,
  },
  Admin: {
    FindUserByEmail: 'find_user_id_by_email' satisfies DbFunction,
    ListAllOrgs: 'list_all_organizations' satisfies DbFunction,
    ListPlans: 'list_plans' satisfies DbFunction,
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
  | (typeof Rpc.Org)[keyof typeof Rpc.Org]
  | (typeof Rpc.Member)[keyof typeof Rpc.Member]
  | (typeof Rpc.Invite)[keyof typeof Rpc.Invite]
  | (typeof Rpc.Subscription)[keyof typeof Rpc.Subscription]
  | (typeof Rpc.Plan)[keyof typeof Rpc.Plan]
  | (typeof Rpc.Campaign)[keyof typeof Rpc.Campaign]
  | (typeof Rpc.Admin)[keyof typeof Rpc.Admin]
  | (typeof Rpc.SystemAdmin)[keyof typeof Rpc.SystemAdmin]
