import { BaseRepository } from '@/repositories/BaseRepository'
import type { ServiceData } from '@/types'
import { Rpc } from '@/types/rpc'

export interface UpdatedProfile {
  id: string
  display_name: string | null
  avatar_url: string | null
  active_organization_id: string | null
}

export class ProfileService extends BaseRepository {
  async updateMyProfile(
    displayName?: string,
    avatarUrl?: string
  ): ServiceData<UpdatedProfile> {
    return this.callRpc<UpdatedProfile>(Rpc.Profile.UpdateMyProfile, {
      p_display_name: displayName,
      p_avatar_url: avatarUrl,
    })
  }
}

export const profileService = new ProfileService()
