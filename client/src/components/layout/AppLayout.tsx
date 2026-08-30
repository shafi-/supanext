'use client'

import { Nav } from './Nav'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'
import { useSystemAdmin } from '@/hooks/useSystemAdmin'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth()
  const { currentOrg } = useOrganization()
  const { isSystemAdmin } = useSystemAdmin()

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav
        user={user ? { email: user.email } : null}
        currentOrg={currentOrg ? { id: currentOrg.id } : null}
        isSystemAdmin={isSystemAdmin}
        onSignOut={() => void signOut()}
      />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
