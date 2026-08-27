'use client'

import { useState, useEffect } from 'react'
import { organizationService } from '@/services/OrganizationService'
import type { OrganizationStatus } from '@/services/OrganizationService'
import { OrgOverview } from '@/components/org/OrgOverview'

interface OverviewTabContainerProps {
  orgId: string
}

export function OverviewTabContainer({ orgId }: OverviewTabContainerProps) {
  const [status, setStatus] = useState<OrganizationStatus | null>(null)

  useEffect(() => {
    let active = true
    organizationService.getOrganizationStatus(orgId).then(({ data }) => {
      if (active && data) setStatus(data)
    })
    return () => {
      active = false
    }
  }, [orgId])

  return <OrgOverview status={status} />
}
