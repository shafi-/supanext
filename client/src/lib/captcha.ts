/**
 * Cloudflare Turnstile integration (optional).
 *
 * Set NEXT_PUBLIC_TURNSTILE_SITE_KEY to enable captcha on auth forms;
 * leave empty to ship with no captcha. The matching secret must be set on
 * the Supabase side ([auth.captcha] in config.toml / dashboard Auth
 * settings) or verification fails server-side.
 *
 * Local/test keys (always pass):
 *   site:  1x00000000000000000000AA
 *   secret: 1x0000000000000000000000000000000AA
 */
export const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''

export function isCaptchaEnabled(): boolean {
  return TURNSTILE_SITE_KEY.length > 0
}
