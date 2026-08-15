import { BaseRepository } from '@/repositories/BaseRepository'
import type { ServiceData, UserProfile, UpdateProfileDto } from '@/types'
import { Rpc } from '@/types/rpc'

export class ProfileService extends BaseRepository {
  async getMyProfile(): ServiceData<UserProfile> {
    return this.callRpc<UserProfile>(Rpc.Profile.GetMyProfile)
  }

  async getUserProfile(userId: string): ServiceData<UserProfile> {
    return this.callRpc<UserProfile>(Rpc.Profile.GetUserProfile, { target_user_id: userId })
  }

  async updateMyProfile(data: UpdateProfileDto): ServiceData<UserProfile> {
    return this.callRpc<UserProfile>(Rpc.Profile.UpdateMyProfile, {
      new_full_name: data.full_name,
      new_avatar_url: data.avatar_url,
      new_metadata: data.metadata,
    })
  }
}

export const profileService = new ProfileService()
