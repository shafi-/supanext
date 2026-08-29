'use client'

import { useState, useCallback } from 'react'
import { usePaginatedList } from '@/hooks/usePaginatedList'
import { {{SNAKE}}Service } from '@/services/{{PASCAL}}Service'
import { {{PASCAL}}View } from '@/components/{{PLURAL}}/{{PASCAL}}View'
import type { {{PASCAL}} } from '@/types/{{SNAKE}}'

export function {{PASCAL}}Container() {
  const {
    items,
    loading,
    error,
    loadMore,
    hasMore,
  } = usePaginatedList<{{PASCAL}}>({
    fetcher: (params) => {{SNAKE}}Service.list(params),
  })

  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<{{PASCAL}} | null>(null)

  const handleCreate = useCallback(async (data: { name: string; description?: string }) => {
    const { error } = await {{SNAKE}}Service.create(data)
    if (!error) setShowCreate(false)
  }, [])

  const handleUpdate = useCallback(async (id: string, data: { name?: string; description?: string }) => {
    const { error } = await {{SNAKE}}Service.update(id, data)
    if (!error) setEditing(null)
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    await {{SNAKE}}Service.delete(id)
  }, [])

  return (
    <{{PASCAL}}View
      items={items}
      loading={loading}
      error={error}
      hasMore={hasMore}
      onLoadMore={loadMore}
      showCreate={showCreate}
      onToggleCreate={() => setShowCreate(!showCreate)}
      onCreate={handleCreate}
      editing={editing}
      onEdit={setEditing}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
    />
  )
}
