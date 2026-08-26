'use client'

import { useState, useEffect } from 'react'
import type { UserProfile } from '@/types'

interface ProfileComponentProps {
  email?: string
  orgName?: string
  profile: UserProfile | null
  loading: boolean
  saving: boolean
  onSave: (fullName: string) => void
}

export function ProfileComponent({ email, orgName, profile, loading, saving, onSave }: ProfileComponentProps) {
  const [fullName, setFullName] = useState('')

  useEffect(() => {
    if (profile) setFullName(profile.full_name ?? '')
  }, [profile])

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>
      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <p className="mt-1 text-gray-900">{email}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Organization</label>
          <p className="mt-1 text-gray-900">{orgName ?? 'None'}</p>
        </div>
        <button
          onClick={() => onSave(fullName)}
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
