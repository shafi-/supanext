'use client'

import { Suspense } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { useRequiredParam } from '@/hooks/useQueryParam'
import { usePublicOrg } from '@/hooks/usePublicOrg'
import Link from 'next/link'

function PublicOrgContent() {
  const slug = useRequiredParam('slug')
  const { org, loading, error } = usePublicOrg(slug)

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        {loading && (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading organization...</div>
          </div>
        )}

        {error && (
          <div className="text-center py-12 space-y-4">
            <h1 className="text-2xl font-bold text-gray-900">Organization Not Found</h1>
            <p className="text-gray-600">{error}</p>
            <Link href="/" className="text-blue-600 hover:underline">
              Go home
            </Link>
          </div>
        )}

        {org && (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h1 className="text-3xl font-bold text-gray-900">{org.name}</h1>
              {org.description && (
                <p className="text-lg text-gray-600 max-w-xl mx-auto">{org.description}</p>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">About</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Created</span>
                  <p className="font-medium">
                    {new Date(org.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Slug</span>
                  <p className="font-medium font-mono">{org.slug}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <Link
                href="/auth/login"
                className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="bg-white text-gray-900 border border-gray-300 px-6 py-3 rounded-md hover:bg-gray-50 font-medium"
              >
                Create Account
              </Link>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default function PublicOrgPage() {
  return (
    <Suspense fallback={<AppLayout><div className="text-center py-12"><div className="text-gray-500">Loading...</div></div></AppLayout>}>
      <PublicOrgContent />
    </Suspense>
  )
}
