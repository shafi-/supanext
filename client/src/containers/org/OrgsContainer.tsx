'use client'

import { useState, useEffect } from 'react'
import { useRequireAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'
import { useRequiredParam, isUuid } from '@/hooks/useQueryParam'
import { organizationService } from '@/services/OrganizationService'
import { OrgList } from '@/components/org/OrgList'
import { CreateOrgForm } from '@/components/org/CreateOrgForm'
import { OrgDetailsContainer } from './OrgDetailsContainer'

export function OrgsContainer() {
  useRequireAuth()
  const orgId = useRequiredParam('id')
  const { organizations, loading: orgLoading, refresh } = useOrganization()
  const [error, setError] = useState<string | null>(null)
  const [orgListState, setOrgListState] = useState({
    name: '',
    slug: '',
    creating: false,
    error: null as string | null,
  })

  useEffect(() => {
    if (!orgId) return
    if (!isUuid(orgId)) {
      setError('Invalid organization ID')
    }
  }, [orgId])

  const selectedOrg = organizations.find((o) => o.id === orgId) ?? null

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const { name, slug } = orgListState
    if (!name.trim() || !slug.trim()) return
    setOrgListState({ ...orgListState, creating: true, error: null })
    const { error: err } = await organizationService.requestOrganization(
      name.trim(),
      slug.trim().toLowerCase()
    )
    setOrgListState({ ...orgListState, creating: false, name: '', slug: '', error: err || null })
    if (!err) {
      await refresh()
    }
  }

  if (!orgId) {
    return (
      <div className="space-y-6">
        <CreateOrgForm
          name={orgListState.name}
          slug={orgListState.slug}
          creating={orgListState.creating}
          error={orgListState.error}
          onNameChange={(value) => setOrgListState({ ...orgListState, name: value })}
          onSlugChange={(value) => setOrgListState({ ...orgListState, slug: value })}
          onSubmit={handleCreate}
        />
        <OrgList organizations={organizations} loading={orgLoading} />
      </div>
    )
  }

  if (error) return <div className="text-red-600">{error}</div>
  if (!selectedOrg && orgLoading) return <div>Loading...</div>
  if (!selectedOrg && !orgLoading) return <p className="text-gray-500">You are not a member of this organization.</p>
  if (!selectedOrg) return null

  return <OrgDetailsContainer org={selectedOrg} />
}