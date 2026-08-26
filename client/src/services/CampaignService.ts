import { BaseRepository } from '@/repositories/BaseRepository'
import type { ServiceData } from '@/types'
import { Rpc } from '@/types/rpc'

export interface Campaign {
  id: string
  organization_id: string
  name: string
  description: string | null
  goal_minor: number | null
  currency: string
  starts_at: string | null
  ends_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export class CampaignService extends BaseRepository {
  async listCampaigns(orgId?: string): ServiceData<Campaign[]> {
    return this.callRpc<Campaign[]>(Rpc.Campaign.List, { p_org_id: orgId })
  }

  async createCampaign(input: {
    name: string
    description?: string
    goalMinor?: number
    currency?: string
    startsAt?: string
    endsAt?: string
    orgId?: string
  }): ServiceData<string> {
    return this.callRpc<string>(Rpc.Campaign.Create, {
      p_name: input.name,
      p_description: input.description,
      p_goal_minor: input.goalMinor,
      p_currency: input.currency,
      p_starts_at: input.startsAt,
      p_ends_at: input.endsAt,
      p_org_id: input.orgId,
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
