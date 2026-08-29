import { BaseRepository } from '@/repositories/BaseRepository'
import type { ServiceData } from '@/types'
import type { PaginationParams } from '@/types/pagination'
import { Rpc } from '@/types/rpc'

// Re-export from types/campaign.ts for backward compatibility
export type { Campaign } from '@/types/campaign'

import type { Campaign } from '@/types/campaign'

export class CampaignService extends BaseRepository {
  async listCampaigns(params?: PaginationParams): ServiceData<Campaign[]> {
    return this.callRpc<Campaign[]>(Rpc.Campaign.ListMy, {
      p_limit: params?.limit ?? 20,
      p_cursor: params?.cursor,
    })
  }

  async createCampaign(input: {
    name: string
    description?: string
    goalMinor?: number
    currency?: string
    startsAt?: string
    endsAt?: string
  }): ServiceData<string> {
    return this.callRpc<string>(Rpc.Campaign.Create, {
      p_name: input.name,
      p_description: input.description,
      p_goal_minor: input.goalMinor,
      p_currency: input.currency,
      p_starts_at: input.startsAt,
      p_ends_at: input.endsAt,
    })
  }

  async updateCampaign(
    campaignId: string,
    patch: {
      name?: string
      description?: string
      goalMinor?: number
      currency?: string
      startsAt?: string
      endsAt?: string
    }
  ): ServiceData<void> {
    return this.callRpc<void>(Rpc.Campaign.Update, {
      p_campaign_id: campaignId,
      p_name: patch.name,
      p_description: patch.description,
      p_goal_minor: patch.goalMinor,
      p_currency: patch.currency,
      p_starts_at: patch.startsAt,
      p_ends_at: patch.endsAt,
    })
  }

  async deleteCampaign(campaignId: string): ServiceData<void> {
    return this.callRpc<void>(Rpc.Campaign.Delete, { p_campaign_id: campaignId })
  }
}

export const campaignService = new CampaignService()
