'use client'

import { useEffect, useRef } from 'react'
import { TURNSTILE_SITE_KEY } from '@/lib/captcha'

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  remove: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

/**
 * Cloudflare Turnstile widget. Renders nothing when no site key is
 * configured. Reports tokens via onToken(null) on expiry/error so the
 * form can block submission until a fresh token exists.
 */
export function Captcha({ onToken }: { onToken: (token: string | null) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const cbRef = useRef(onToken)
  cbRef.current = onToken

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return

    function renderWidget() {
      if (!containerRef.current || widgetIdRef.current !== null || !window.turnstile) return
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token: string) => cbRef.current(token),
        'expired-callback': () => cbRef.current(null),
        'error-callback': () => cbRef.current(null),
      })
    }

    if (document.getElementById('cf-turnstile-script')) {
      renderWidget()
    } else {
      const script = document.createElement('script')
      script.id = 'cf-turnstile-script'
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
      script.async = true
      script.onload = renderWidget
      document.head.appendChild(script)
    }

    return () => {
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [])

  if (!TURNSTILE_SITE_KEY) return null
  return <div ref={containerRef} className="flex justify-center" />
}
