'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { useAuth } from '@/hooks/useAuth'
import { useRequireAuth } from '@/hooks/useAuth'

export default function ProfilePage() {
  useRequireAuth()

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Profile</h1>
        <ProfileContent />
      </div>
    </AppLayout>
  )
}

function ProfileContent() {
  const { user } = useAuth()

  return (
    <div className="bg-white p-6 rounded-lg shadow space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <p className="mt-1 text-gray-900">{user?.email}</p>
      </div>
    </div>
  )
}
