import type { ReactNode } from 'react'

/** Cursor type — matches the UUID/string returned by the API */
export type PaginationCursor = string | null

/** Standard shape returned by every paginated RPC */
export interface PaginatedResponse<T> {
  items: T[]
  next_cursor: PaginationCursor
}

/** Params sent to paginated RPCs */
export interface PaginationParams {
  limit?: number
  cursor?: PaginationCursor
}

/** Props for components that render paginated lists */
export interface PaginatedListProps<T> {
  items: T[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  onLoadMore: () => void
  renderItem: (item: T, index: number) => ReactNode
  renderEmpty?: () => ReactNode
  renderError?: (error: string) => ReactNode
}
