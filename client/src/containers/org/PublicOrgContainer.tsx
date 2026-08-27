'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRequiredParam } from '@/hooks/useQueryParam'
import { organizationService } from '@/services/OrganizationService'
import type { PublicOrgProfile } from '@/types/organization'
import { PublicOrgView } from '@/components/org/PublicOrgView'

export function PublicOrgContainer() {
  const idParam = useRequiredParam('id')
  const slugParam = useRequiredParam('slug')
  const identifier = idParam ?? slugParam
  const [org, setOrg] = useState<PublicOrgProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!identifier) {
      setOrg(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    organizationService.getOrgPublic(identifier).then(({ data, error }) => {
      if (cancelled) return
      if (!error) setOrg(data)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [identifier])

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b bg-white">
        <div className="max-w-4xl mx-auto px-4 flex justify-between h-16 items-center">
          <Link href="/" className="font-bold text-xl text-gray-900">
            SupaNext
          </Link>
          <div className="flex items-center space-x-4">
            <Link
              href="/auth/login"
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
            >
              Create Account
            </Link>
          </div>
        </div>
      </header>

      <main>
        {loading ? (
          <div className="max-w-4xl mx-auto py-12 text-gray-500">Loading...</div>
        ) : !org ? (
          <div className="max-w-4xl mx-auto py-12">
            <h1 className="text-2xl font-bold text-gray-900">Organization Not Found</h1>
            <p className="mt-2 text-gray-500">
              The organization you are looking for does not exist or is not available.
            </p>
          </div>
        ) : (
          <PublicOrgView org={org} />
        )}
      </main>
    </div>
  )
}
