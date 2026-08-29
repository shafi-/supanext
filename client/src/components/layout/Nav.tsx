'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="font-bold text-xl">SupaNext</Link>
            {user && (
              <div className="hidden md:flex gap-4">
                <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
                {isSystemAdmin && (
                  <Link href="/admin" className="text-gray-600 hover:text-gray-900">Admin</Link>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link href="/profile" className="text-gray-600 hover:text-gray-900">{user.email}</Link>
                <button onClick={() => { onSignOut(); router.push('/auth/login/') }} className="text-gray-600 hover:text-gray-900">Sign out</button>
              </>
            ) : (
              <Link href="/auth/login" className="text-gray-600 hover:text-gray-900">Sign in</Link>
            )}
            <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>Menu</button>
          </div>
        </div>
      </div>
      {mobileOpen && (
        <div className="md:hidden border-t">
          <div className="px-4 py-2 space-y-2">
            {user && (
              <>
                <Link href="/dashboard" className="block py-2" onClick={() => setMobileOpen(false)}>Dashboard</Link>
                {isSystemAdmin && (
                  <Link href="/admin" className="block py-2" onClick={() => setMobileOpen(false)}>Admin</Link>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
