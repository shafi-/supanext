/**
 * Permission code constants — single source of truth for frontend permission strings.
 *
 * These MUST match the permission codes in:
 *   - app.permissions table (migrations/20240825000000_initial_migration.sql)
 *   - security.can_perform() calls in SQL functions
 *
 * If you add/remove a value here, update the SQL permissions table and vice versa.
 */

export const Permission = {
  // Fundraising
  FundraisingView: 'fundraising.view',
  FundraisingCreate: 'fundraising.create',
  FundraisingUpdate: 'fundraising.update',
  FundraisingDelete: 'fundraising.delete',
  FundraisingManage: 'fundraising.manage',

  // Organization members
  MembersInvite: 'organization.members.invite',
  MembersChangeRole: 'organization.members.change_role',
  MembersRemove: 'organization.members.remove',
  MembersPermissionsManage: 'organization.members.permissions.manage',
} as const

export type Permission = (typeof Permission)[keyof typeof Permission]
