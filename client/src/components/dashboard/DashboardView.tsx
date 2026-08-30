'use client'

import Link from 'next/link'
import { ROUTES } from '@/lib/routes'
import type { AuthUser } from '@/types/auth'
import type { CurrentSubscription } from '@/services/SubscriptionService'
import { Button } from '@/components/ui/button'

interface DashboardViewProps {
  user: AuthUser | null
  subscription: CurrentSubscription | null
  hasFeature: (featureCode: string) => boolean
  onSignOut: () => void
}

export function DashboardView({
  user,
  subscription,
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
              My Subscription
            </h3>
            {subscription ? (
              <div>
                <p className="mb-2 text-gray-600">
                  Plan:{' '}
                  <span className="font-medium">{subscription.plan_name}</span>
                </p>
                <p className="mb-4 text-gray-600">
                  Status:{' '}
                  <span className="font-medium">{subscription.status}</span>
                </p>
                {hasFeature('fundraising') && (
                  <Link
                    href="/campaigns"
                    className="font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    Manage Campaigns →
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No active subscription.</p>
            )}
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
      </main>
    </div>
  )
}
