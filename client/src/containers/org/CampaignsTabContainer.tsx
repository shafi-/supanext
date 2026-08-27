'use client'

import { useState, useEffect, useCallback } from 'react'
import { campaignService, type Campaign } from '@/services/CampaignService'
import { OrgCampaigns } from '@/components/org/OrgCampaigns'

interface CampaignsTabContainerProps {
  orgId: string
}

export function CampaignsTabContainer({ orgId }: CampaignsTabContainerProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await campaignService.listCampaigns(orgId)
    if (data) setCampaigns(data)
    if (err) setError(err)
    setLoading(false)
  }, [orgId])

  useEffect(() => {
    void load()
  }, [load])

  const handleCreate = async (input: { name: string; description: string; goal: string }) => {
    if (!input.name.trim()) return
    setSaving(true)
    const { error: err } = await campaignService.createCampaign({
      name: input.name.trim(),
      description: input.description.trim() || undefined,
      goalMinor: input.goal ? parseInt(input.goal) : undefined,
      orgId,
    })
    setSaving(false)
    if (err) {
      setError(err)
      return
    }
    await load()
  }

  const handleDelete = async (id: string) => {
    const { error: err } = await campaignService.deleteCampaign(id)
    if (err) setError(err)
    await load()
  }

  return (
    <OrgCampaigns
      campaigns={campaigns}
      loading={loading}
      error={error}
      saving={saving}
      onCreate={handleCreate}
      onDelete={handleDelete}
    />
  )
}
