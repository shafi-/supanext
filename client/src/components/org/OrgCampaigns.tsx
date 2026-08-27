import { useState } from 'react'
import type { Campaign } from '@/services/CampaignService'

interface CampaignForm {
  name: string
  description: string
  goal: string
}

interface OrgCampaignsProps {
  campaigns: Campaign[]
  loading: boolean
  error: string | null
  saving: boolean
  onCreate: (input: CampaignForm) => void
  onDelete: (id: string) => void
}

export function OrgCampaigns({
  campaigns,
  loading,
  error,
  saving,
  onCreate,
  onDelete,
}: OrgCampaignsProps) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CampaignForm>({ name: '', description: '', goal: '' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreate(form)
    setForm({ name: '', description: '', goal: '' })
    setShowForm(false)
  }

  return (
    <div className="space-y-4 max-w-3xl">
      {error && <p className="text-red-600">{error}</p>}
      <button onClick={() => setShowForm(!showForm)}
        className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
        {showForm ? 'Cancel' : 'New Campaign'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow space-y-3">
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
                <p className="text-xs text-gray-500">{c.description || 'No description'}</p>
                {c.goal_minor && (
                  <p className="text-xs text-gray-400">Goal: {(c.goal_minor / 100).toFixed(2)}</p>
                )}
              </div>
              <button onClick={() => void onDelete(c.id)}
                className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200">
                Delete
              </button>
            </li>
          ))}
          {campaigns.length === 0 && (
            <p className="text-gray-500">No campaigns yet.</p>
          )}
        </ul>
      )}
    </div>
  )
}
