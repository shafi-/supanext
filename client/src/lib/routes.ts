/**
 * Centralized route constants.
 *
 * Use these instead of hardcoding URLs in components and containers.
 * Keeps the public/auth-gated/admin boundary explicit and gives a single
 * place to update if a route changes.
 *
 * `trailingSlash: true` is set in next.config.js — every static route
 * is terminal-slashed so the static export behaves consistently.
 *
 * Layering:
 *   - Public:    marketing + auth + invite (no auth required)
 *   - App:       auth-gated user pages (dashboard, profile, orgs)
 *   - Admin:     system-admin pages
 */
export const ROUTES = {
  // Public — marketing & legal
  home: '/',
  about: '/about/',
  privacy: '/privacy/',

  // Public — auth flows
  login: '/auth/login/',
  register: '/auth/register/',
  resetPassword: '/auth/reset-password/',

  // Public — invite acceptance
  invite: '/invite/',

  // Public — public org page (visible to anyone with the link)
  publicOrg: '/org/',

  // App — auth-gated user pages
  appDashboard: '/app/dashboard/',
  appProfile: '/app/profile/',
  appOrgs: '/app/orgs/',

  // Admin — system-admin pages
  admin: '/admin/',
  adminOrgs: '/admin/orgs/',
  adminPlans: '/admin/plans/',
  adminSubscriptions: '/admin/subscriptions/',
  adminAudit: '/admin/audit/',
} as const

export type Route = (typeof ROUTES)[keyof typeof ROUTES]

/**
 * Auth-gated org detail. Uses a query string (no dynamic routes — static
 * export forbids `[param]` segments).
 */
export const orgDetail = (orgId: string) => `/app/orgs/?id=${orgId}`

/**
 * Fallback path used by the auth `?next=` handler when the requested
 * redirect is missing or open-redirect-unsafe (e.g. //evil.com).
 */
export const DEFAULT_POST_LOGIN = ROUTES.appDashboard
