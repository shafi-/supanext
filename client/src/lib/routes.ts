/**
 * Centralized route constants.
 *
 * Use these instead of hardcoding URLs in components and containers.
 * Keeps the public/auth-gated/admin boundary explicit and gives a single
 * place to update if a route changes.
 *
 * `trailingSlash: true` is set in next.config.js — every route is
 * terminal-slashed so the static export behaves consistently.
 *
 * Layering:
 *   - Public:    marketing + auth + invite (no auth required)
 *   - App:       auth-gated user pages (dashboard, profile)
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

  // App — auth-gated user pages
  appDashboard: '/app/dashboard/',
  appProfile: '/app/profile/',

  // Admin — system-admin pages
  admin: '/admin/',
  adminUsers: '/admin/users/',
  adminPlans: '/admin/plans/',
  adminSubscriptions: '/admin/subscriptions/',
  adminAudit: '/admin/audit/',
} as const

export type Route = (typeof ROUTES)[keyof typeof ROUTES]

/**
 * Fallback path used by the auth `?next=` handler when the requested
 * redirect is missing or open-redirect-unsafe (e.g. //evil.com).
 */
export const DEFAULT_POST_LOGIN = ROUTES.appDashboard
