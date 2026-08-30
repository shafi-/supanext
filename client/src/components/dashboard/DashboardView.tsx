'use client'

import Link from 'next/link'
import { ROUTES } from '@/lib/routes'
import type { AuthUser } from '@/types/auth'
import type { OrgStats, SessionOrganization } from '@/types/organization'
import { Button } from '@/components/ui/button'

interface DashboardViewProps {
  user: AuthUser | null
  currentOrg: SessionOrganization | null
  organizations: SessionOrganization[]
  stats: OrgStats | null
  hasFeature: (featureCode: string) => boolean
  onSignOut: () => void
}

export function DashboardView({
  user,
  currentOrg,
  organizations,
  stats,
  hasFeature,
  onSignOut,
}: DashboardViewProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-900">
                SupaNext
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href={ROUTES.appDashboard}
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-900"
              >
                Dashboard
              </Link>
              <Link
                href={ROUTES.appProfile}
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Profile
              </Link>
              <Button
                variant="ghost"
                onClick={onSignOut}
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome back, {user?.email}!</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              My Organizations
            </h3>
            <p className="mb-4 text-gray-600">
              Manage your organizations and team members.
            </p>
            <Link
              href={ROUTES.appOrgs}
              className="font-medium text-indigo-600 hover:text-indigo-700"
            >
              View Organizations →
            </Link>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Profile Settings
            </h3>
            <p className="mb-4 text-gray-600">
              Update your profile information and preferences.
            </p>
            <Link
              href={ROUTES.appProfile}
              className="font-medium text-indigo-600 hover:text-indigo-700"
            >
              Update Profile →
            </Link>
          </div>
        </div>

        <div className="mt-8 rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            {currentOrg ? `Stats — ${currentOrg.name}` : 'Quick Stats'}
          </h3>
          {!currentOrg ? (
            <p className="text-gray-500">
              Select an organization to see stats.{' '}
              <Link
                href={ROUTES.appOrgs}
                className="text-indigo-600 hover:underline"
              >
                Go to Organizations →
              </Link>
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="text-center">
                <p className="text-3xl font-bold text-indigo-600">
                  {organizations.length}
                </p>
                <p className="text-gray-600">Organizations</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">
                  {stats?.member_count ?? '—'}
                </p>
                <p className="text-gray-600">Team Members</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {hasFeature('fundraising')
                    ? (stats?.campaign_count ?? 0)
                    : '—'}
                </p>
                <p className="text-gray-600">Campaigns</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
