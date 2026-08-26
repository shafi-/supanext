import { BaseRepository } from '@/repositories/BaseRepository'
import type { ServiceData } from '@/types'
import { Rpc } from '@/types/rpc'

// Re-export from types/profile.ts for backward compatibility
export type { UpdatedProfile } from '@/types/profile'

import type { UpdatedProfile } from '@/types/profile'

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
