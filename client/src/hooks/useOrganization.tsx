'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { organizationService, type SessionOrganization } from '@/services/OrganizationService'

interface OrganizationContextType {
  displayName: string | null
  /** All organizations the user belongs to. */
  organizations: SessionOrganization[]
  /** The active organization (server-truth via get_session_context). */
  currentOrg: SessionOrganization | null
  membership: { role: 'admin' | 'member' } | null
  loading: boolean
  error: string | null
  switchOrg: (orgId: string) => Promise<void>
  refresh: () => Promise<void>
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [organizations, setOrganizations] = useState<SessionOrganization[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await organizationService.getSessionContext()
    if (err) setError(err)
    if (data) {
      setOrganizations(data.organizations ?? [])
      setActiveId(data.active_organization_id)
      setDisplayName(data.display_name || null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const switchOrg = useCallback(
    async (orgId: string) => {
      setError(null)
      const { error: err } = await organizationService.setActiveOrganization(orgId)
      if (err) {
        setError(err)
        return
      }
      setActiveId(orgId)
    },
    []
  )

  const currentOrg = useMemo(
    () => organizations.find((o) => o.id === activeId) ?? null,
    [organizations, activeId]
  )

  const membership = useMemo(
    () => (currentOrg ? { role: currentOrg.role } : null),
    [currentOrg]
  )

  return (
    <OrganizationContext.Provider
      value={{ displayName, organizations, currentOrg, membership, loading, error, switchOrg, refresh }}
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
