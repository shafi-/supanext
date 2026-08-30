import { useState } from 'react'
import type { Campaign } from '@/services/CampaignService'
import { Button } from '@/components/ui/button'

interface CampaignForm {
  name: string
  description: string
  goal: string
}

interface OrgCampaignsProps {
  campaigns: Campaign[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  onLoadMore: () => void
  saving: boolean
  onCreate: (input: CampaignForm) => void
  onDelete: (id: string) => void
}

export function OrgCampaigns({
  campaigns,
  loading,
  loadingMore,
  error,
  hasMore,
  onLoadMore,
  saving,
  onCreate,
  onDelete,
}: OrgCampaignsProps) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CampaignForm>({
    name: '',
    description: '',
    goal: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreate(form)
    setForm({ name: '', description: '', goal: '' })
    setShowForm(false)
  }

  return (
    <div className="max-w-3xl space-y-4">
      {error && <p className="text-red-600">{error}</p>}
      <button
        onClick={() => setShowForm(!showForm)}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
      >
        {showForm ? 'Cancel' : 'New Campaign'}
      </button>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-lg bg-white p-4 shadow"
        >
          <input
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Campaign name"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Description"
            rows={2}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-2">
            <input
              value={form.goal}
              type="number"
              min="0"
              onChange={e => setForm({ ...form, goal: e.target.value })}
              placeholder="Goal (minor units)"
              className="w-48 rounded-md border px-3 py-1.5 text-sm"
            />
            <span className="text-xs text-gray-400">optional</span>
            <button
              type="submit"
              disabled={saving}
              className="ml-auto rounded-md bg-green-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Create'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div>Loading...</div>
      ) : (
        <ul className="space-y-2">
          {campaigns.map(c => (
            <li
              key={c.id}
              className="flex items-center gap-3 rounded-lg bg-white p-4 shadow"
            >
              <div className="flex-1">
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-gray-500">
                  {c.description || 'No description'}
                </p>
                {c.goal_minor && (
                  <p className="text-xs text-gray-400">
                    Goal: {(c.goal_minor / 100).toFixed(2)}
                  </p>
                )}
              </div>
              <button
                onClick={() => void onDelete(c.id)}
                className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200"
              >
                Delete
              </button>
            </li>
          ))}
          {hasMore && (
            <li className="py-4 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={onLoadMore}
                disabled={loadingMore}
                className="text-blue-600 hover:text-blue-800"
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </Button>
            </li>
          )}
          {campaigns.length === 0 && (
            <p className="text-gray-500">No campaigns yet.</p>
          )}
        </ul>
      )}
    </div>
  )
}
