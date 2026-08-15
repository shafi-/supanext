'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { useRequireAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'
import { useRequiredParam, isUuid } from '@/hooks/useQueryParam'
import { organizationService } from '@/services/OrganizationService'
import { todoService } from '@/services/TodoService'
import { memberService } from '@/services/MemberService'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { Todo, MemberView } from '@/types'

export default function OrgsPage() {
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
  const [tab, setTab] = useState<'todos' | 'members' | 'settings'>('todos')
  if (!currentOrg) return null
  return (
    <>
      <h1 className="text-2xl font-bold">{currentOrg.name}</h1>
      <p className="text-gray-600">{currentOrg.description ?? 'No description'}</p>
      <div className="flex gap-4 border-b mb-4">
        {(['todos', 'members', 'settings'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`pb-2 capitalize ${tab === t ? 'border-b-2 border-blue-600 font-medium' : ''}`}>{t}</button>
        ))}
      </div>
      {tab === 'todos' && <TodosTab orgId={orgId} />}
      {tab === 'members' && <MembersTab orgId={orgId} />}
      {tab === 'settings' && <SettingsTab orgId={orgId} />}
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
  const [members, setMembers] = useState<MemberView[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await memberService.getMembers(orgId)
    if (data) setMembers(data)
    setLoading(false)
  }, [orgId])

  useEffect(() => { load() }, [load])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = email.trim()
    if (!val) return
    await memberService.addMember(orgId, val)
    setEmail('')
    load()
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex gap-2">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Add by email..." className="flex-1 border rounded-md px-3 py-2" />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md">Add</button>
      </form>
      {loading ? <div>Loading...</div> : (
        <ul className="space-y-2">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 bg-white p-4 rounded-lg shadow">
              <div>
                <p className="font-medium">{m.full_name ?? m.email}</p>
                <p className="text-sm text-gray-500">{m.email} - {m.role}</p>
              </div>
              <button onClick={() => memberService.removeMember(orgId, m.user_id).then(load)} className="ml-auto text-red-600 hover:text-red-800">Remove</button>
            </li>
          ))}
          {members.length === 0 && <p className="text-gray-500">No members yet.</p>}
        </ul>
      )}
    </div>
  )
}

function SettingsTab({ orgId }: { orgId: string }) {
  const { currentOrg, refreshOrg } = useOrganization()
  const [name, setName] = useState(currentOrg?.name ?? '')
  const [description, setDescription] = useState(currentOrg?.description ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (currentOrg) {
      setName(currentOrg.name)
      setDescription(currentOrg.description ?? '')
    }
  }, [currentOrg])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await organizationService.updateOrganization(orgId, { name: name.trim(), description: description.trim() || undefined })
    await refreshOrg()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <form onSubmit={handleSave} className="bg-white p-6 rounded-lg shadow space-y-4 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full border rounded-md px-3 py-2" required />
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
