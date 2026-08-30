'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PaginationCursor, PaginationParams } from '@/types/pagination'

interface UsePaginatedListOptions<T> {
  /** Service method that returns a flat array of items */
  fetcher: (
    params: PaginationParams
  ) => Promise<{ data: T[] | null; error: string | null }>
  /** Items per page (default: 20) */
  limit?: number
  /** Set to false to prevent auto-load on mount (default: true) */
  enabled?: boolean
  /**
   * Field name on each item used as the cursor for the next request.
   * Must match what the SQL `p_cursor` filter expects.
   * Default: 'created_at'
   */
  cursorField?: keyof T
}

interface UsePaginatedListReturn<T> {
  items: T[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => Promise<void>
  reset: () => void
  refresh: () => Promise<void>
}

export function usePaginatedList<T>({
  fetcher,
  limit = 20,
  enabled = true,
  cursorField = 'created_at' as keyof T,
}: UsePaginatedListOptions<T>): UsePaginatedListReturn<T> {
  const [items, setItems] = useState<T[]>([])
  const [cursor, setCursor] = useState<PaginationCursor>(null)
  const [loading, setLoading] = useState(enabled)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const mountedRef = useRef(false)

  const fetchPage = useCallback(
    async (pageCursor: PaginationCursor, append: boolean) => {
      const result = await fetcher({ limit, cursor: pageCursor })
      if (result.error) {
        setError(result.error)
        return
      }
      const data = result.data
      if (!data) return

      setItems(prev => (append ? [...prev, ...data] : data))
      setHasMore(data.length === limit)
      setCursor(
        data.length > 0
          ? (data[data.length - 1][cursorField] as PaginationCursor)
          : null
      )
      setError(null)
    },
    [fetcher, limit, cursorField]
  )

  // Initial load
  useEffect(() => {
    if (!enabled) return
    if (mountedRef.current) return
    mountedRef.current = true
    void fetchPage(null, false).finally(() => setLoading(false))
  }, [enabled, fetchPage])

  // Load more (next page)
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    await fetchPage(cursor, true)
    setLoadingMore(false)
  }, [loadingMore, hasMore, cursor, fetchPage])

  // Reset to first page
  const reset = useCallback(() => {
    setItems([])
    setCursor(null)
    setHasMore(true)
    setError(null)
  }, [])

  // Refresh current data (reset + reload)
  const refresh = useCallback(async () => {
    reset()
    setLoading(true)
    await fetchPage(null, false)
    setLoading(false)
  }, [reset, fetchPage])

  return {
    items,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    reset,
    refresh,
  }
}
