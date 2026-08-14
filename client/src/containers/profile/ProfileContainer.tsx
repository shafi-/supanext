'use client'

import { useState, useEffect } from 'react'
import { profileService } from '@/services/ProfileService'
import type { User, UpdateProfileDto } from '@/types'
import ProfileComponent from '@/components/profile/ProfileComponent'

interface ProfileContainerProps {
  userId: string
}

/**
 * Profile Container
 * Manages state and service calls for profile operations
 * Components are kept stateless and receive data via props
 */
export default function ProfileContainer({ userId }: ProfileContainerProps) {
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [updateLoading, setUpdateLoading] = useState(false)

  // Load profile data
  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true)
        setError(null)

        const { data, error: serviceError } = await profileService.getMyProfile()

        if (serviceError) {
          setError(serviceError)
        } else if (data) {
          setProfile(data)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [userId])

  // Handle profile update
  const handleUpdate = async (data: UpdateProfileDto) => {
    try {
      setUpdateLoading(true)
      setError(null)

      const { data: updatedProfile, error: serviceError } = await profileService.updateMyProfile(data)

      if (serviceError) {
        setError(serviceError)
        return { success: false, error: serviceError }
      }

      if (updatedProfile) {
        setProfile(updatedProfile)
        setIsEditing(false)
        return { success: true, error: null }
      }

      return { success: false, error: 'Update failed' }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setUpdateLoading(false)
    }
  }

  // Handle edit mode toggle
  const handleToggleEdit = () => {
    setIsEditing(!isEditing)
    setError(null)
  }

  // Handle cancel edit
  const handleCancelEdit = () => {
    setIsEditing(false)
    setError(null)
  }

  return (
    <ProfileComponent
      profile={profile}
      loading={loading}
      error={error}
      isEditing={isEditing}
      updateLoading={updateLoading}
      onUpdate={handleUpdate}
      onToggleEdit={handleToggleEdit}
      onCancelEdit={handleCancelEdit}
    />
  )
}