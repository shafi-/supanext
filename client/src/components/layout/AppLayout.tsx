'use client'

import { Nav } from './Nav'
import { OrganizationProvider } from '@/hooks/useOrganization'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <OrganizationProvider>
      <div className="min-h-screen bg-gray-50">
        <Nav />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </OrganizationProvider>
  )
}
