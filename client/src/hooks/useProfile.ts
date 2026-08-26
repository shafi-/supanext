'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { profileService } from '@/services/ProfileService'
import type { UserProfile } from '@/types'

export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data } = await profileService.getMyProfile()
    if (data) setProfile(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const saveFullName = useCallback(
    async (fullName: string) => {
      setSaving(true)
      try {
        await profileService.updateMyProfile({ full_name: fullName })
        await load()
      } finally {
        setSaving(false)
      }
    },
    [load]
  )

  return { user, profile, loading, saving, saveFullName }
}
