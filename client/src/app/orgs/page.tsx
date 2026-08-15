'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { useRequireAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'
import { organizationService } from '@/services/OrganizationService'
import { todoService } from '@/services/TodoService'
import { memberService } from '@/services/MemberService'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import type { Todo, MemberView, OrganizationDetailView } from '@/types'

export default function OrgPage() {
  useRequireAuth()
  const searchParams = useSearchParams()
  const orgId = searchParams.get('id')
  const { setCurrentOrg, currentOrg } = useOrganization()

  useEffect(() => {
    if (orgId) {
      organizationService.getOrganization(orgId).then(({ data }) => {
        if (data) setCurrentOrg(data)
      })
    }
  }, [orgId, setCurrentOrg])

  if (!orgId) return <AppLayout><div>No organization selected</div></AppLayout>
  if (!currentOrg) return <AppLayout><div>Loading...</div></AppLayout>

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{currentOrg.name}</h1>
        <OrgTabs orgId={orgId} />
      </div>
    </AppLayout>
  )
}

function OrgTabs({ orgId }: { orgId: string }) {
  const [tab, setTab] = useState<'todos' | 'members' | 'settings'>('todos')

  return (
    <div>
      <div className="flex gap-4 border-b mb-4">
        <button onClick={() => setTab('todos')} className={`pb-2 ${tab === 'todos' ? 'border-b-2 border-blue-600' : ''}`}>Todos</button>
        <button onClick={() => setTab('members')} className={`pb-2 ${tab === 'members' ? 'border-b-2 border-blue-600' : ''}`}>Members</button>
        <button onClick={() => setTab('settings')} className={`pb-2 ${tab === 'settings' ? 'border-b-2 border-blue-600' : ''}`}>Settings</button>
      </div>
      {tab === 'todos' && <TodosTab orgId={orgId} />}
      {tab === 'members' && <MembersTab orgId={orgId} />}
      {tab === 'settings' && <SettingsTab orgId={orgId} />}
    </div>
  )
}

function TodosTab({ orgId }: { orgId: string }) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')

  const load = async () => {
    setLoading(true)
    const { data } = await todoService.getTodos(orgId)
    if (data) setTodos(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [orgId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    await todoService.createTodo(orgId, newTitle.trim())
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
              <button onClick={() => todoService.deleteTodo(t.id).then(load)} className="ml-auto text-red-600">Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function MembersTab({ orgId }: { orgId: string }) {
  const [members, setMembers] = useState<MemberView[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')

  const load = async () => {
    setLoading(true)
    const { data } = await memberService.getMembers(orgId)
    if (data) setMembers(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [orgId])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    await memberService.addMember(orgId, email.trim())
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
              <button onClick={() => memberService.removeMember(orgId, m.user_id).then(load)} className="ml-auto text-red-600">Remove</button>
            </li>
          ))}
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await organizationService.updateOrganization(orgId, { name, description })
    await refreshOrg()
    setSaving(false)
  }

  return (
    <form onSubmit={handleSave} className="bg-white p-6 rounded-lg shadow space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full border rounded-md px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 block w-full border rounded-md px-3 py-2" rows={3} />
      </div>
      <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-md disabled:opacity-50">
        {saving ? 'Saving...' : 'Save'}
      </button>
    </form>
  )
}
