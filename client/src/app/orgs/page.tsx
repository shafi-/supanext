'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { useRequireAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'
import { usePermissions } from '@/hooks/usePermissions'
import { useRequiredParam, isUuid } from '@/hooks/useQueryParam'
import { useSubscription } from '@/hooks/useSubscription'
import { organizationService } from '@/services/OrganizationService'
import { todoService } from '@/services/TodoService'
import { memberService } from '@/services/MemberService'
import { inviteService } from '@/services/InviteService'
import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import type { Todo, MemberView, Invite } from '@/types'
import { BillingTab } from '@/components/subscription/BillingTab'

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
  const { currentOrg, setCurrentOrg, loading: orgLoading } = useOrganization()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orgId) {
      setCurrentOrg(null)
      return
    }
    if (!isUuid(orgId)) {
      setError('Invalid organization ID')
      return
    }
    setError(null)
    organizationService.getOrganization(orgId).then(({ data, error: err }) => {
      if (err) setError(err)
      if (data) setCurrentOrg(data)
    })
  }, [orgId, setCurrentOrg])

  return (
    <AppLayout>
      <div className="space-y-6">
        {!orgId && <OrgList />}
        {orgId && error && <div className="text-red-600">{error}</div>}
        {orgId && !error && currentOrg && <OrgDetail orgId={orgId} />}
        {orgId && !error && !currentOrg && orgLoading && <div>Loading...</div>}
      </div>
    </AppLayout>
  )
}

function OrgList() {
  const { organizations, loading } = useOrganization()
  if (loading) return <div>Loading...</div>
  return (
    <>
      <h1 className="text-2xl font-bold">Organizations</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {organizations.map((org) => (
          <Link key={org.id} href={`/orgs?id=${org.id}`} className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
            <h2 className="font-semibold text-lg">{org.name}</h2>
            <p className="text-gray-600 text-sm mt-1">{org.description ?? 'No description'}</p>
            <p className="text-gray-500 text-xs mt-2">{org.member_count} members</p>
          </Link>
        ))}
        {organizations.length === 0 && <p className="text-gray-500 col-span-full">No organizations yet.</p>}
      </div>
    </>
  )
}

function OrgDetail({ orgId }: { orgId: string }) {
  const { currentOrg } = useOrganization()
  const { isOrgAdmin, isOrgOwner } = usePermissions()
  const { hasFeature } = useSubscription(orgId)
  const [tab, setTab] = useState<'todos' | 'members' | 'settings' | 'billing'>('todos')
  if (!currentOrg) return null
  return (
    <>
      <h1 className="text-2xl font-bold">{currentOrg.name}</h1>
      <p className="text-gray-600">{currentOrg.description ?? 'No description'}</p>
      <div className="flex gap-4 border-b mb-4">
        {hasFeature('todos') && (
          <button onClick={() => setTab('todos')} className={`pb-2 ${tab === 'todos' ? 'border-b-2 border-blue-600 font-medium' : ''}`}>Todos</button>
        )}
        {hasFeature('members') && (
          <button onClick={() => setTab('members')} className={`pb-2 ${tab === 'members' ? 'border-b-2 border-blue-600 font-medium' : ''}`}>Members</button>
        )}
        {hasFeature('settings') && isOrgAdmin() && (
          <button onClick={() => setTab('settings')} className={`pb-2 ${tab === 'settings' ? 'border-b-2 border-blue-600 font-medium' : ''}`}>Settings</button>
        )}
        {isOrgOwner() && (
          <button onClick={() => setTab('billing')} className={`pb-2 ${tab === 'billing' ? 'border-b-2 border-blue-600 font-medium' : ''}`}>Billing</button>
        )}
      </div>
      {tab === 'todos' && hasFeature('todos') && <TodosTab orgId={orgId} />}
      {tab === 'members' && hasFeature('members') && <MembersTab orgId={orgId} />}
      {tab === 'settings' && hasFeature('settings') && <SettingsTab orgId={orgId} />}
      {tab === 'billing' && isOrgOwner() && <BillingTab orgId={orgId} isOwner={isOrgOwner()} />}
    </>
  )
}

function TodosTab({ orgId }: { orgId: string }) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await todoService.getTodos(orgId)
    if (data) setTodos(data)
    setLoading(false)
  }, [orgId])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const title = newTitle.trim()
    if (!title) return
    await todoService.createTodo(orgId, title)
    setNewTitle('')
    load()
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreate} className="flex gap-2">
        <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="New todo..." className="flex-1 border rounded-md px-3 py-2" />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md">Add</button>
      </form>
      {loading ? <div>Loading...</div> : (
        <ul className="space-y-2">
          {todos.map((t) => (
            <li key={t.id} className="flex items-center gap-3 bg-white p-4 rounded-lg shadow">
              <input type="checkbox" checked={t.completed} onChange={() => todoService.updateTodo(t.id, { completed: !t.completed }).then(load)} />
              <span className={t.completed ? 'line-through text-gray-500' : ''}>{t.title}</span>
              <button onClick={() => todoService.deleteTodo(t.id).then(load)} className="ml-auto text-red-600 hover:text-red-800">Delete</button>
            </li>
          ))}
          {todos.length === 0 && <p className="text-gray-500">No todos yet.</p>}
        </ul>
      )}
    </div>
  )
}

function MembersTab({ orgId }: { orgId: string }) {
  const { isOrgAdmin } = usePermissions()
  const [members, setMembers] = useState<MemberView[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [activeSubTab, setActiveSubTab] = useState<'members' | 'invites'>('members')

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: memberData }, { data: inviteData }] = await Promise.all([
      memberService.getMembers(orgId),
      isOrgAdmin() ? inviteService.getInvites(orgId) : Promise.resolve({ data: [] }),
    ])
    if (memberData) setMembers(memberData)
    if (inviteData) setInvites(inviteData)
    setLoading(false)
  }, [orgId, isOrgAdmin])

  useEffect(() => { load() }, [load])

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = email.trim()
    if (!val) return
    await memberService.addMember(orgId, val)
    setEmail('')
    load()
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = email.trim()
    if (!val) return
    await inviteService.generateInvite(orgId, val, inviteRole)
    setEmail('')
    load()
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    await memberService.updateMemberRole(orgId, userId, newRole)
    load()
  }

  const handleRemoveMember = async (userId: string) => {
    await memberService.removeMember(orgId, userId)
    load()
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-4">
      {isOrgAdmin() && (
        <div className="flex gap-2 border-b mb-4">
          <button onClick={() => setActiveSubTab('members')} className={`pb-2 ${activeSubTab === 'members' ? 'border-b-2 border-blue-600 font-medium' : ''}`}>Members</button>
          <button onClick={() => setActiveSubTab('invites')} className={`pb-2 ${activeSubTab === 'invites' ? 'border-b-2 border-blue-600 font-medium' : ''}`}>Pending Invites ({invites.length})</button>
        </div>
      )}

      {activeSubTab === 'members' && (
        <>
          {isOrgAdmin() && (
            <form onSubmit={handleAddMember} className="flex gap-2">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Add member by email..." className="flex-1 border rounded-md px-3 py-2" />
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md">Add</button>
            </form>
          )}
          <ul className="space-y-2">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 bg-white p-4 rounded-lg shadow">
                <div className="flex-1">
                  <p className="font-medium">{m.full_name ?? m.email}</p>
                  <p className="text-sm text-gray-500">{m.email}</p>
                </div>
                {isOrgAdmin() ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.user_id, e.target.value)}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button onClick={() => handleRemoveMember(m.user_id)} className="text-red-600 hover:text-red-800 text-sm">Remove</button>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">{m.role}</span>
                )}
              </li>
            ))}
            {members.length === 0 && <p className="text-gray-500">No members yet.</p>}
          </ul>
        </>
      )}

      {activeSubTab === 'invites' && isOrgAdmin() && (
        <>
          <form onSubmit={handleInvite} className="flex gap-2">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Invite by email..." className="flex-1 border rounded-md px-3 py-2" />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="border rounded px-2 py-2">
              <option value="viewer">Viewer</option>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md">Invite</button>
          </form>
          <ul className="space-y-2">
            {invites.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 bg-white p-4 rounded-lg shadow">
                <div className="flex-1">
                  <p className="font-medium">{inv.email}</p>
                  <p className="text-sm text-gray-500">Role: {inv.role} · Expires: {new Date(inv.expires_at).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={async () => {
                    await inviteService.revokeInvite(inv.id)
                    load()
                  }}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Revoke
                </button>
              </li>
            ))}
            {invites.length === 0 && <p className="text-gray-500">No pending invites.</p>}
          </ul>
        </>
      )}
    </div>
  )
}

function SettingsTab({ orgId }: { orgId: string }) {
  const { currentOrg, refreshOrg } = useOrganization()
  const { isOrgAdmin } = usePermissions()
  const [name, setName] = useState(currentOrg?.name ?? '')
  const [slug, setSlug] = useState(currentOrg?.slug ?? '')
  const [description, setDescription] = useState(currentOrg?.description ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (currentOrg) {
      setName(currentOrg.name)
      setSlug(currentOrg.slug)
      setDescription(currentOrg.description ?? '')
    }
  }, [currentOrg])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      const { error } = await organizationService.updateOrganization(orgId, {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
      })
      if (error) {
        setSaving(false)
        return
      }
      await refreshOrg()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      // Error already handled by service
    } finally {
      setSaving(false)
    }
  }

  if (!isOrgAdmin()) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Only admins and owners can manage organization settings.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="bg-white p-6 rounded-lg shadow space-y-4 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full border rounded-md px-3 py-2" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Slug</label>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
          pattern="[a-z0-9\-]+"
          className="mt-1 block w-full border rounded-md px-3 py-2 font-mono"
          required
        />
        <p className="mt-1 text-xs text-gray-500">Used in public URL: /orgs/public/?slug={slug}</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 block w-full border rounded-md px-3 py-2" rows={3} />
      </div>
      <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50">
        {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
      </button>
    </form>
  )
}
