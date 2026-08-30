'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ProfileComponentProps {
  email?: string
  displayName: string | null
  loading?: boolean
  saving: boolean
  onSave: (displayName: string, avatarUrl?: string) => Promise<boolean>
}

export function ProfileComponent({
  email,
  displayName,
  saving,
  onSave,
}: ProfileComponentProps) {
  const [name, setName] = useState(displayName ?? '')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (displayName !== null) setName(displayName)
  }, [displayName])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>
      <div className="space-y-4 rounded-lg bg-white p-6 shadow">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <p className="mt-1 text-gray-900">{email}</p>
        </div>
        <div>
          <label
            className="block text-sm font-medium text-gray-700"
            htmlFor="display-name"
          >
            Display Name
          </label>
          <Input
            id="display-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={100}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label
            className="block text-sm font-medium text-gray-700"
            htmlFor="avatar-url"
          >
            Avatar URL
          </label>
          <Input
            id="avatar-url"
            type="url"
            placeholder="https://…"
            value={avatarUrl}
            onChange={e => setAvatarUrl(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <Button
          onClick={async () => {
            const ok = await onSave(name, avatarUrl.trim() || undefined)
            if (ok) {
              setSaved(true)
              setTimeout(() => setSaved(false), 2000)
            }
          }}
          disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
