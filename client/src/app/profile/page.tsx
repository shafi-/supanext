'use client'

import { useState } from 'react'
import { useRequireAuth } from '@/hooks/useAuth'
import ProfileContainer from '@/containers/profile/ProfileContainer'

export default function ProfilePage() {
  const { user } = useRequireAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <a href="/" className="text-xl font-bold text-gray-900">
                SupaNext
              </a>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/dashboard"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </a>
              <a
                href="/profile"
                className="text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Profile
              </a>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="mt-2 text-gray-600">Manage your profile information and preferences.</p>
        </div>

        <ProfileContainer userId={user?.id || ''} />
      </main>
    </div>
  )
}