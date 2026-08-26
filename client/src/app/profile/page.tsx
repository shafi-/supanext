'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { useAuth, useRequireAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'
import { useProfile } from '@/hooks/useProfile'
import { ProfileComponent } from '@/components/profile/ProfileComponent'
import { useEffect, useState } from 'react'

export default function ProfilePage() {
  useRequireAuth()

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <ProfileContent />
      </div>
    </AppLayout>
  )
}

function ProfileContent() {
  const { user } = useAuth()
  const { currentOrg, displayName: sessionName } = useOrganization()
  const { updateProfile, saving } = useProfile()
  const [error, setError] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)

  // Prefill once the session context resolves.
  useEffect(() => {
    if (sessionName !== null) setDisplayName(sessionName)
  }, [sessionName])

  const handleSave = async (name: string, avatarUrl?: string) => {
    setError(null)
    const { data, error: err } = await updateProfile(name || undefined, avatarUrl)
    if (err) {
      setError(err)
      return
    }
    if (data) setDisplayName(data.display_name)
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-red-600">{error}</p>}
      <ProfileComponent
        email={user?.email}
        orgName={currentOrg?.name ?? null}
        displayName={displayName}
        saving={saving}
        onSave={handleSave}
      />
    </div>
  )
}
