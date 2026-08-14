import { BaseRepository } from '@/repositories/BaseRepository'
import type { User, UpdateProfileDto, ServiceData } from '@/types'
import type { Database } from '@/types/database'

/**
 * Profile Service
 * Handles user profile operations using database functions
 */
export class ProfileService extends BaseRepository {
  /**
   * Get current user's profile
   */
  async getMyProfile(): ServiceData<User> {
    return this.callRpc<User>('get_my_profile')
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): ServiceData<User> {
    return this.callRpc<User>('get_user_profile', { target_user_id: userId })
  }

  /**
   * Update current user's profile
   */
  async updateMyProfile(data: UpdateProfileDto): ServiceData<User> {
    return this.callRpc<User>('update_my_profile', {
      new_full_name: data.full_name,
      new_avatar_url: data.avatar_url,
      new_metadata: data.metadata,
    })
  }

  /**
   * Delete current user's profile
   * Note: This should be implemented as a soft delete in the database
   */
  async deleteMyProfile(): ServiceVoid {
    try {
      const userId = await this.requireAuth()

      const { error } = await this.supabase
        .getClient()
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (error) {
        return { error: this.handleError(error) }
      }

      return { error: null }
    } catch (error) {
      return { error: this.handleError(error) }
    }
  }

  /**
   * Upload avatar image
   * Note: This would use Supabase Storage
   */
  async uploadAvatar(file: File): ServiceData<{ url: string; path: string }> {
    try {
      const userId = await this.requireAuth()

      // This is a placeholder - would use Supabase Storage in production
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}/${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Placeholder implementation
      // const { data, error } = await this.supabase
      //   .getClient()
      //   .storage
      //   .from('avatars')
      //   .upload(filePath, file)

      return {
        data: { url: '', path: filePath },
        error: null,
      }
    } catch (error) {
      return { data: null, error: this.handleError(error) }
    }
  }
}

// Export singleton instance
export const profileService = new ProfileService()