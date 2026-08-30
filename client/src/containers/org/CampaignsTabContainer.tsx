'use client'

import { useState, useCallback } from 'react'
import { campaignService } from '@/services/CampaignService'
import { OrgCampaigns } from '@/components/org/OrgCampaigns'
import { usePaginatedList } from '@/hooks/usePaginatedList'

interface CampaignsTabContainerProps {
  orgId: string
}

export function CampaignsTabContainer({ orgId }: CampaignsTabContainerProps) {
  const [saving, setSaving] = useState(false)
  const {
    items: campaigns,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
  } = usePaginatedList({
    fetcher: useCallback(
      params => campaignService.listCampaigns(orgId, params),
      [orgId]
    ),
  })

  const handleCreate = async (input: {
    name: string
    description: string
    goal: string
  }) => {
    if (!input.name.trim()) return
    setSaving(true)
    const { error: err } = await campaignService.createCampaign({
      name: input.name.trim(),
      description: input.description.trim() || undefined,
      goalMinor: input.goal ? parseInt(input.goal) : undefined,
      orgId,
    })
    setSaving(false)
    if (err) return
    await refresh()
  }

  const handleDelete = async (id: string) => {
    const { error: err } = await campaignService.deleteCampaign(id)
    if (err) return
    await refresh()
  }

  return (
    <OrgCampaigns
      campaigns={campaigns}
      loading={loading}
      loadingMore={loadingMore}
      error={error}
      hasMore={hasMore}
      onLoadMore={loadMore}
      saving={saving}
      onCreate={handleCreate}
      onDelete={handleDelete}
    />
  )
}
