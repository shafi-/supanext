'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ROUTES } from '@/lib/routes'

interface NavProps {
  user: { email: string } | null
  isSystemAdmin: boolean
  onSignOut: () => void
}

export function Nav({ user, isSystemAdmin, onSignOut }: NavProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()

  return (
    <nav className="border-b bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold">
              SupaNext
            </Link>
            {user && (
              <div className="hidden gap-4 md:flex">
                <Link
                  href={ROUTES.appDashboard}
                  className="text-gray-600 hover:text-gray-900"
                >
                  Dashboard
                </Link>
                {isSystemAdmin && (
                  <Link
                    href={ROUTES.admin}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    Admin
                  </Link>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link
                  href={ROUTES.appProfile}
                  className="text-gray-600 hover:text-gray-900"
                >
                  {user.email}
                </Link>
                <button
                  onClick={() => {
                    onSignOut()
                    router.push(ROUTES.login)
                  }}
                  className="text-gray-600 hover:text-gray-900"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href={ROUTES.login}
                className="text-gray-600 hover:text-gray-900"
              >
                Sign in
              </Link>
            )}
            <button
              className="md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              Menu
            </button>
          </div>
        </div>
      </div>
      {mobileOpen && (
        <div className="border-t md:hidden">
          <div className="space-y-2 px-4 py-2">
            {user && (
              <>
                <Link
                  href={ROUTES.appDashboard}
                  className="block py-2"
                  onClick={() => setMobileOpen(false)}
                >
                  Dashboard
                </Link>
                {isSystemAdmin && (
                  <Link
                    href={ROUTES.admin}
                    className="block py-2"
                    onClick={() => setMobileOpen(false)}
                  >
                    Admin
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
