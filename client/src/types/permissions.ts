/**
 * Permission code constants — single source of truth for frontend permission strings.
 *
 * User-centric model: only system-level and feature-level permissions exist.
 * Org-scoped permissions have been removed.
 */

export const Permission = {
  // Fundraising
  FundraisingView: 'fundraising.view',
  FundraisingCreate: 'fundraising.create',
  FundraisingUpdate: 'fundraising.update',
  FundraisingDelete: 'fundraising.delete',
  FundraisingManage: 'fundraising.manage',

  // System
  PlansManage: 'system.plans.manage',
} as const

export type Permission = (typeof Permission)[keyof typeof Permission]
