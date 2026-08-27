'use client'

import Link from 'next/link'
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-900">
                SupaNext
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </Link>
              <Link
                href="/profile"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Profile
              </Link>
              <Button
                variant="ghost"
                onClick={onSignOut}
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome back, {user?.email}!</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">My Organizations</h3>
            <p className="text-gray-600 mb-4">Manage your organizations and team members.</p>
            <Link
              href="/orgs"
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              View Organizations →
            </Link>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Settings</h3>
            <p className="text-gray-600 mb-4">Update your profile information and preferences.</p>
            <Link
              href="/profile"
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Update Profile →
            </Link>
          </div>
        </div>

        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {currentOrg ? `Stats — ${currentOrg.name}` : 'Quick Stats'}
          </h3>
          {!currentOrg ? (
            <p className="text-gray-500">
              Select an organization to see stats.{' '}
              <Link href="/orgs" className="text-indigo-600 hover:underline">
                Go to Organizations →
              </Link>
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="text-center">
                <p className="text-3xl font-bold text-indigo-600">{organizations.length}</p>
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
                  {hasFeature('fundraising') ? (stats?.campaign_count ?? 0) : '—'}
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
