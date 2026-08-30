/**
 * Status enum constants — single source of truth for frontend status values.
 *
 * These MUST match the SQL ENUM types in migrations/20240828000000_status_enums.sql.
 * If you add/remove a value here, update the SQL ENUM and vice versa.
 */

export const OrgStatus = {
  Pending: 'pending',
  Active: 'active',
  Suspended: 'suspended',
  Rejected: 'rejected',
} as const

export type OrgStatus = (typeof OrgStatus)[keyof typeof OrgStatus]

export const InvitationStatus = {
  Pending: 'pending',
  Accepted: 'accepted',
  Revoked: 'revoked',
  Expired: 'expired',
} as const

export type InvitationStatus =
  (typeof InvitationStatus)[keyof typeof InvitationStatus]

export const SubscriptionStatus = {
  Trialing: 'trialing',
  Active: 'active',
  PastDue: 'past_due',
  Canceled: 'canceled',
  Expired: 'expired',
} as const

export type SubscriptionStatus =
  (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus]
