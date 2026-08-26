import { useState, useEffect } from 'react'
import { useRequireAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'
import { useSubscription } from '@/hooks/useSubscription'
import { useRequiredParam, isUuid } from '@/hooks/useQueryParam'
import { organizationService } from '@/services/OrganizationService'
import { OrgList } from './components/OrgList'
import { OrgDetail } from './components/OrgDetail'
import { CreateOrgForm } from './components/CreateOrgForm'

type Tab = 'overview' | 'campaigns' | 'members' | 'invites' | 'billing'

export function OrgsContainer() {
  useRequireAuth()
  const orgId = useRequiredParam('id')
  const { currentOrg, organizations, loading: orgLoading, switchOrg, refresh } =
    useOrganization()
  const [error, setError] = useState<string | null>(null)
  const [orgListState, setOrgListState] = useState({
    name: '',
    slug: '',
    creating: false,
    error: null as string | null,
  })
  const [tab, setTab] = useState<Tab>('overview')

  const { subscription, hasFeature } = useSubscription(organizations[0]?.id ?? '')

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

  const isAdmin = selectedOrg.role === 'admin'
  const isActive = currentOrg?.id === selectedOrg.id
  const fundraisingEnabled = subscription != null && Object.keys(subscription).length > 0 && hasFeature('fundraising')

  return (
    <OrgDetail
      org={selectedOrg!}
      isActive={isActive}
      isAdmin={isAdmin}
      hasFundraising={fundraisingEnabled}
      tab={tab}
      onTabChange={setTab}
      onActivate={async () => {
        await switchOrg(selectedOrg!.id)
        await refresh()
      }}
    />
  )
}