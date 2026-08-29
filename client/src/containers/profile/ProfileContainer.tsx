'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/hooks/useAuth'
import { useSessionContext } from '@/hooks/useSessionContext'
import { useProfile } from '@/hooks/useProfile'
import { ProfileComponent } from '@/components/profile/ProfileComponent'

export function ProfileContainer() {
  const { user } = useRequireAuth()
  const { displayName: sessionName } = useSessionContext()
  const { updateProfile, saving } = useProfile()
  const [error, setError] = useState<string | null>(null)
  const [sessionDisplayName, setSessionDisplayName] = useState<string | null>(null)

  // Prefill once the session context resolves.
  useEffect(() => {
    if (sessionName !== null) setSessionDisplayName(sessionName)
  }, [sessionName])

  const handleSave = async (name: string, avatarUrl?: string): Promise<boolean> => {
    setError(null)
    const { data, error: err } = await updateProfile(name || undefined, avatarUrl)
    if (err) {
      setError(err)
      return false
    }
    if (data) setSessionDisplayName(data.display_name)
    return true
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-red-600">{error}</p>}
      <ProfileComponent
        email={user?.email}
        displayName={sessionDisplayName}
        saving={saving}
        onSave={handleSave}
      />
    </div>
  )
}
