import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface CreateOrgFormProps {
  name: string
  slug: string
  creating: boolean
  error: string | null
  onNameChange: (value: string) => void
  onSlugChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
}

export function CreateOrgForm({
  name,
  slug,
  creating,
  error,
  onNameChange,
  onSlugChange,
  onSubmit,
}: CreateOrgFormProps) {
  return (
    <form onSubmit={onSubmit} className="bg-white p-4 rounded-lg shadow space-y-3">
      <p className="text-sm font-medium text-gray-700">Request a new organization</p>
      <p className="text-xs text-gray-500">
        Starts as pending — a system administrator approves it before it becomes usable.
      </p>
      <div className="flex flex-col md:flex-row gap-2">
        <div className="flex-1">
          <Input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Organization name"
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
        <div className="md:w-48">
          <Input
            value={slug}
            onChange={(e) => onSlugChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            placeholder="slug"
            pattern="[a-z0-9][a-z0-9-]*"
            className="w-full border rounded-md px-3 py-2 font-mono"
          />
        </div>
        <Button
          type="submit"
          disabled={creating}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {creating ? 'Creating…' : 'Create'}
        </Button>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </form>
  )
}