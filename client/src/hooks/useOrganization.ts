'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { organizationService } from '@/services/OrganizationService'
import { memberService } from '@/services/MemberService'
import type { OrganizationDetailView, Membership } from '@/types'

interface OrganizationContextType {
  currentOrg: OrganizationDetailView | null
  membership: Membership | null
  organizations: OrganizationDetailView[]
  loading: boolean
  error: string | null
  setCurrentOrg: (org: OrganizationDetailView | null) => void
  refreshOrg: () => Promise<void>
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [currentOrg, setCurrentOrg] = useState<OrganizationDetailView | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [organizations, setOrganizations] = useState<OrganizationDetailView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadOrganizations = async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await organizationService.getMyOrganizations()
    if (err) setError(err)
    if (data) setOrganizations(data as unknown as OrganizationDetailView[])
    setLoading(false)
  }

  const loadMembership = async (orgId: string) => {
    const { data } = await memberService.getMembership(orgId)
    if (data && data.length > 0) {
      setMembership(data[0])
    }
  }

  const refreshOrg = async () => {
    if (currentOrg) {
      const { data } = await organizationService.getOrganization(currentOrg.id)
      if (data) setCurrentOrg(data)
    }
  }

  useEffect(() => {
    loadOrganizations()
  }, [])

  useEffect(() => {
    if (currentOrg) {
      loadMembership(currentOrg.id)
    }
  }, [currentOrg?.id])

  return (
    <OrganizationContext.Provider
      value={{
        currentOrg,
        membership,
        organizations,
        loading,
        error,
        setCurrentOrg,
        refreshOrg,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider')
  }
  return context
}
