import { useState, useEffect, useCallback } from 'react'
import { campaignService, type Campaign } from '@/services/CampaignService'

interface CampaignsTabProps {
  orgId: string
}

export function CampaignsTab({ orgId }: CampaignsTabProps) {
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
                <p className="text-xs text-gray-500">{c.description || 'No description'}</p>
                {c.goal_minor && (
                  <p className="text-xs text-gray-400">Goal: {(c.goal_minor / 100).toFixed(2)}</p>
                )}
              </div>
              <button onClick={() => void handleDelete(c.id)}
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