'use client'

import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'

/**
 * Safely extract and validate a required query parameter.
 * Returns null if missing/empty, validated string if valid.
 */
export function useRequiredParam(key: string): string | null {
  const searchParams = useSearchParams()
  return useMemo(() => {
    const val = searchParams.get(key)
    if (!val || val.trim() === '') return null
    return val.trim()
  }, [searchParams, key])
}

/**
 * Validate a UUID format (v4).
 */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  )
}

/**
 * Validate an invite token (hex string, 64 chars from gen_random_bytes(32)).
 */
export function isInviteToken(value: string): boolean {
  return /^[0-9a-f]{64}$/i.test(value)
}
