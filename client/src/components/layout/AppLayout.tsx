'use client'

import { Nav } from './Nav'
import { useAuth } from '@/hooks/useAuth'
import { useSessionContext } from '@/hooks/useSessionContext'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth()
  const { isSystemAdmin } = useSessionContext()

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav
        user={user ? { email: user.email } : null}
        isSystemAdmin={isSystemAdmin}
        onSignOut={() => void signOut()}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
