'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { useRequireAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'
import { useRequiredParam, isUuid } from '@/hooks/useQueryParam'
import { useSubscription } from '@/hooks/useSubscription'
import {
  organizationService,
  type OrganizationStatus,
  type SessionOrganization,
} from '@/services/OrganizationService'
import { memberService } from '@/services/MemberService'
import { inviteService, type InvitationPayload } from '@/services/InviteService'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { BillingTab } from '@/components/subscription/BillingTab'
import { campaignService, type Campaign } from '@/services/CampaignService'
import Link from 'next/link'

export default function OrgsPage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="max-w-4xl mx-auto py-12 text-gray-500">Loading...</div>
        </AppLayout>
      }
    >
      <OrgsContent />
    </Suspense>
  )
}

function OrgsContent() {
  useRequireAuth()
  const orgId = useRequiredParam('id')
  const { currentOrg, organizations, loading: orgLoading, switchOrg, refresh } =
    useOrganization()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orgId) return
    if (!isUuid(orgId)) {
      setError('Invalid organization ID')
    }
  }, [orgId])

  // Deep-link support: resolve the org from memberships, not just the
  // server-side active selection.
  const selectedOrg = organizations.find((o) => o.id === orgId) ?? null

  return (
    <AppLayout>
      <div className="space-y-6">
        {!orgId && <OrgList />}
        {orgId && error && <div className="text-red-600">{error}</div>}
        {orgId && !error && selectedOrg && (
          <OrgDetail
            org={selectedOrg}
            isActive={currentOrg?.id === orgId}
            onActivate={async () => {
              await switchOrg(orgId)
              await refresh()
            }}
          />
        )}
        {orgId && !error && !selectedOrg && orgLoading && <div>Loading...</div>}
        {orgId && !error && !selectedOrg && !orgLoading && (
          <p className="text-gray-500">You are not a member of this organization.</p>
        )}
      </div>
    </AppLayout>
  )
}

function OrgList() {
  const { organizations, loading, refresh } = useOrganization()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) return
    setCreating(true)
    setError(null)
    const { error: err } = await organizationService.requestOrganization(
      name.trim(),
      slug.trim().toLowerCase()
    )
    setCreating(false)
    if (err) {
      setError(err)
      return
    }
    setName('')
    setSlug('')
    await refresh()
  }

  return (
    <>
      <h1 className="text-2xl font-bold">Organizations</h1>

      <form onSubmit={handleCreate} className="bg-white p-4 rounded-lg shadow space-y-3">
        <p className="text-sm font-medium text-gray-700">Request a new organization</p>
        <p className="text-xs text-gray-500">
          Starts as pending — a system administrator approves it before it becomes usable.
        </p>
        <div className="flex flex-col md:flex-row gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Organization name" className="flex-1 border rounded-md px-3 py-2" />
          <input value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            placeholder="slug" pattern="[a-z0-9][a-z0-9-]*"
            className="border rounded-md px-3 py-2 font-mono md:w-48" />
          <button type="submit" disabled={creating}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50">
            {creating ? 'Creating…' : 'Create'}
          </button>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </form>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => (
            <Link key={org.id} href={`/orgs?id=${org.id}`}
              className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg">{org.name}</h2>
                <StatusBadge status={org.status} />
              </div>
              <p className="text-gray-500 text-xs mt-2">Role: {org.role}</p>
            </Link>
          ))}
          {organizations.length === 0 && (
            <p className="text-gray-500 col-span-full">No organizations yet.</p>
          )}
        </div>
      )}
    </>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'active' ? 'bg-green-100 text-green-800'
    : status === 'pending' ? 'bg-yellow-100 text-yellow-800'
    : status === 'suspended' ? 'bg-red-100 text-red-800'
    : 'bg-gray-100 text-gray-600'
  return <span className={`px-2 py-0.5 rounded-full text-xs ${cls}`}>{status}</span>
}

type Tab = 'overview' | 'campaigns' | 'members' | 'invites' | 'billing'

function OrgDetail({
  org,
  isActive,
  onActivate,
}: {
  org: SessionOrganization
  isActive: boolean
  onActivate: () => Promise<void>
}) {
  // Role is scoped to the SELECTED organization, not the active one.
  const isOrgAdmin = org.role === 'admin'
  const { subscription, hasFeature } = useSubscription(org.id)
  const [tab, setTab] = useState<Tab>('overview')

  const fundraisingEnabled = subscription != null && Object.keys(subscription).length > 0 && hasFeature('fundraising')

  return (
    <>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{org.name}</h1>
        <StatusBadge status={org.status} />
        {!isActive && org.status === 'active' && (
          <button onClick={() => void onActivate()}
            className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100">
            Make active
          </button>
        )}
      </div>
      {org.status !== 'active' && (
        <p className="text-sm text-gray-500">
          This organization is {org.status}. Most actions are unavailable until it becomes active.
        </p>
      )}
      <div className="flex gap-4 border-b mb-4 overflow-x-auto">
        <button onClick={() => setTab('overview')}
          className={`pb-2 whitespace-nowrap ${tab === 'overview' ? 'border-b-2 border-blue-600 font-medium' : ''}`}>
          Overview
        </button>
        {fundraisingEnabled && (
          <button onClick={() => setTab('campaigns')}
            className={`pb-2 whitespace-nowrap ${tab === 'campaigns' ? 'border-b-2 border-blue-600 font-medium' : ''}`}>
            Campaigns
          </button>
        )}
        <button onClick={() => setTab('members')} disabled={!fundraisingEnabled}
          className={`pb-2 whitespace-nowrap ${tab === 'members' ? 'border-b-2 border-blue-600 font-medium' : ''} ${!fundraisingEnabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
          Members
        </button>
        {isOrgAdmin && (
          <button onClick={() => setTab('invites')} disabled={!fundraisingEnabled}
            className={`pb-2 whitespace-nowrap ${tab === 'invites' ? 'border-b-2 border-blue-600 font-medium' : ''} ${!fundraisingEnabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
            Invitations
          </button>
        )}
        <button onClick={() => setTab('billing')}
          className={`pb-2 whitespace-nowrap ${tab === 'billing' ? 'border-b-2 border-blue-600 font-medium' : ''}`}>
          Billing
        </button>
      </div>
      {tab === 'overview' && <OverviewTab orgId={org.id} />}
      {tab === 'campaigns' && fundraisingEnabled && <CampaignsTab orgId={org.id} />}
      {tab === 'members' && fundraisingEnabled && <MembersTab orgId={org.id} isAdmin={isOrgAdmin} />}
      {tab === 'invites' && isOrgAdmin && fundraisingEnabled && <InvitesTab orgId={org.id} />}
      {tab === 'billing' && <BillingReadonly orgId={org.id} />}
      {!fundraisingEnabled && tab !== 'overview' && tab !== 'billing' && null}
      {subscription && !hasFeature('fundraising') && tab !== 'billing' && tab !== 'overview' && (
        <p className="text-sm text-gray-400">Current plan does not include this feature.</p>
      )}
    </>
  )
}

function OverviewTab({ orgId }: { orgId: string }) {
  const [status, setStatus] = useState<OrganizationStatus | null>(null)

  useEffect(() => {
    organizationService.getOrganizationStatus(orgId).then(({ data }) => {
      if (data) setStatus(data)
    })
  }, [orgId])

  if (!status) return <div className="text-gray-500 text-sm">Loading status…</div>

  return (
    <div className="bg-white p-6 rounded-lg shadow space-y-2 max-w-xl">
      <p><span className="text-gray-500 text-sm">Name:</span> {status.name}</p>
      <p><span className="text-gray-500 text-sm">Status:</span> {status.status}</p>
      {status.suspension_note && (
        <p><span className="text-gray-500 text-sm">Note:</span> {status.suspension_note}</p>
      )}
    </div>
  )
}

interface MemberRow {
  user_id: string
  email: string
  display_name: string | null
  role: 'admin' | 'member'
  permissions: string[]
}

const GRANTABLE_PERMISSIONS = [
  'fundraising.view',
  'fundraising.create',
  'fundraising.update',
  'fundraising.delete',
]

function MembersTab({ orgId, isAdmin }: { orgId: string; isAdmin: boolean }) {
  const [members, setMembers] = useState<MemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await memberService.getMembers(orgId)
    if (data) setMembers(data)
    if (err) setError(err)
    setLoading(false)
  }, [orgId])

  useEffect(() => {
    void load()
  }, [load])

  const handleRoleChange = async (userId: string, role: string) => {
    const { error: err } = await memberService.changeMemberRole(userId, role as 'admin' | 'member', orgId)
    if (err) setError(err)
    await load()
  }

  const handleRemove = async (userId: string) => {
    const { error: err } = await memberService.removeMember(userId, orgId)
    if (err) setError(err)
    await load()
  }

  const handlePermission = async (userId: string, permission: string, granted: boolean) => {
    const { error: err } = await memberService.setMemberPermission(userId, permission, granted, orgId)
    if (err) setError(err)
    await load()
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-4">
      {error && <p className="text-red-600">{error}</p>}
      <ul className="space-y-2">
        {members.map((m) => (
          <li key={m.user_id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="font-medium">{m.display_name ?? m.email}</p>
                <p className="text-sm text-gray-500">{m.email}</p>
              </div>
              {isAdmin ? (
                <select value={m.role}
                  onChange={(e) => handleRoleChange(m.user_id, e.target.value)}
                  className="border rounded px-2 py-1 text-sm">
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                </select>
              ) : (
                <span className="text-sm text-gray-500">{m.role}</span>
              )}
              {isAdmin && m.role !== 'admin' && (
                <button onClick={() => handleRemove(m.user_id)}
                  className="text-red-600 hover:text-red-800 text-sm">Remove</button>
              )}
            </div>
            {isAdmin && m.role === 'member' && (
              <div className="mt-3 flex flex-wrap gap-3 pl-4 border-t pt-3">
                {GRANTABLE_PERMISSIONS.map((perm) => (
                  <label key={perm} className="inline-flex items-center gap-1.5 text-sm">
                    <input type="checkbox"
                      checked={m.permissions.includes(perm)}
                      onChange={(e) => handlePermission(m.user_id, perm, e.target.checked)} />
                    {perm.replace('fundraising.', '')}
                  </label>
                ))}
              </div>
            )}
          </li>
        ))}
        {members.length === 0 && <p className="text-gray-500">No members yet.</p>}
      </ul>
    </div>
  )
}

function InvitesTab({ orgId }: { orgId: string }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('member')
  const [lastInvite, setLastInvite] = useState<(InvitationPayload & { email: string }) | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = email.trim()
    if (!val) return
    setSending(true)
    setError(null)
    const { data, error: err } = await inviteService.inviteMember(val, role, orgId)
    setSending(false)
    if (err || !data) {
      setError(err ?? 'Failed to create invitation')
      return
    }
    setLastInvite({ ...data, email: val })
    setEmail('')
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <form onSubmit={handleInvite} className="flex gap-2">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="Invite by email…" className="flex-1 border rounded-md px-3 py-2" />
        <select value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
          className="border rounded px-2 py-2">
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" disabled={sending}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50">
          {sending ? 'Inviting…' : 'Invite'}
        </button>
      </form>
      {error && <p className="text-red-600">{error}</p>}

      {lastInvite && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-2">
          <p className="text-sm font-medium text-blue-900">
            Invitation created for {lastInvite.email}.
          </p>
          <p className="text-xs text-blue-700">
            Deliver this link yourself — the database never sends emails:
          </p>
          <code className="block bg-white p-2 rounded border text-xs break-all">
            {typeof window !== 'undefined' &&
              `${window.location.origin}/invite?token=${lastInvite.token}`}
          </code>
          <p className="text-xs text-blue-700">
            Expires {new Date(lastInvite.expires_at).toLocaleString()}
          </p>
        </div>
      )}

      <p className="text-sm text-gray-500">
        Pending invitation tracking is not available yet — store the link when you mint it.
      </p>
    </div>
  )
}

function BillingReadonly({ orgId }: { orgId: string }) {
  const { subscription, loading, error } = useSubscription(orgId)
  return <BillingTab subscription={subscription} loading={loading} error={error} />
}

function CampaignsTab({ orgId }: { orgId: string }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', goal: '' })
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    const { error: err } = await campaignService.createCampaign({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      goalMinor: form.goal ? parseInt(form.goal) : undefined,
      orgId,
    })
    setSaving(false)
    if (err) {
      setError(err)
      return
    }
    setForm({ name: '', description: '', goal: '' })
    setShowForm(false)
    await load()
  }

  const handleDelete = async (id: string) => {
    const { error: err } = await campaignService.deleteCampaign(id)
    if (err) setError(err)
    await load()
  }

  return (
    <div className="space-y-4 max-w-3xl">
      {error && <p className="text-red-600">{error}</p>}
      <button onClick={() => setShowForm(!showForm)}
        className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
        {showForm ? 'Cancel' : 'New Campaign'}
      </button>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white p-4 rounded-lg shadow space-y-3">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Campaign name" className="w-full border rounded-md px-3 py-2 text-sm" />
          <textarea value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Description" rows={2}
            className="w-full border rounded-md px-3 py-2 text-sm" />
          <div className="flex gap-2 items-center">
            <input value={form.goal} type="number" min="0"
              onChange={(e) => setForm({ ...form, goal: e.target.value })}
              placeholder="Goal (minor units)" className="border rounded-md px-3 py-1.5 text-sm w-48" />
            <span className="text-xs text-gray-400">optional</span>
            <button type="submit" disabled={saving}
              className="ml-auto px-3 py-1.5 bg-green-600 text-white rounded-md text-sm disabled:opacity-50">
              {saving ? 'Saving…' : 'Create'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div>Loading...</div>
      ) : (
        <ul className="space-y-2">
          {campaigns.map((c) => (
            <li key={c.id} className="flex items-center gap-3 bg-white p-4 rounded-lg shadow">
              <div className="flex-1">
                <p className="font-medium">{c.name}</p>
                {c.description && <p className="text-sm text-gray-500">{c.description}</p>}
                <p className="text-xs text-gray-400 mt-1">
                  {c.goal_minor != null && `Goal: ${(c.goal_minor / 100).toFixed(2)} ${c.currency}`}
                  {' · '}
                  Created {new Date(c.created_at).toLocaleDateString()}
                </p>
              </div>
              <button onClick={() => handleDelete(c.id)}
                className="text-red-600 hover:text-red-800 text-sm">Delete</button>
            </li>
          ))}
          {campaigns.length === 0 && <p className="text-gray-500">No campaigns yet.</p>}
        </ul>
      )}
    </div>
  )
}
