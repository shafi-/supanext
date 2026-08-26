'use client'

import { useCallback, useState } from 'react'
import { profileService } from '@/services/ProfileService'
import type { ServiceData } from '@/types'
import type { UpdatedProfile } from '@/services/ProfileService'

export function useProfile() {
  const [saving, setSaving] = useState(false)

  const updateProfile = useCallback(
    async (
      displayName?: string,
      avatarUrl?: string
    ): Promise<ServiceData<UpdatedProfile>> => {
      setSaving(true)
      const result = await profileService.updateMyProfile(displayName, avatarUrl)
      setSaving(false)
      return result
    },
    []
  )

  return { updateProfile, saving }
}
