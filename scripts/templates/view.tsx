'use client'

import { Button } from '@/components/ui/button'
import type { {{PASCAL}} } from '@/types/{{SNAKE}}'

interface {{PASCAL}}ViewProps {
  items: {{PASCAL}}[]
  loading: boolean
  error: string | null
  hasMore: boolean
  onLoadMore: () => void
  showCreate: boolean
  onToggleCreate: () => void
  onCreate: (data: { name: string; description?: string }) => Promise<void>
  editing: {{PASCAL}} | null
  onEdit: (item: {{PASCAL}} | null) => void
  onUpdate: (id: string, data: Partial<{{PASCAL}}>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function {{PASCAL}}View({
  items,
  loading,
  error,
  hasMore,
  onLoadMore,
  showCreate,
  onToggleCreate,
  editing,
  onDelete,
}: {{PASCAL}}ViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{{PASCAL}}s</h1>
        <Button onClick={onToggleCreate}>
          {showCreate ? 'Cancel' : 'New {{PASCAL}}'}
        </Button>
      </div>

      {error && <div className="text-red-500 text-sm">{error}</div>}

      <div className="grid gap-4">
        {items.map((item) => (
          <div key={item.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{item.name}</h3>
                {item.description && (
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(item)}>
                  Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => onDelete(item.id)}>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {loading && <div className="text-center py-4">Loading...</div>}

      {!loading && hasMore && (
        <Button variant="outline" onClick={onLoadMore} className="w-full">
          Load more
        </Button>
      )}
    </div>
  )
}
