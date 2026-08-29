import type { ReactNode } from 'react'

/** Cursor type — matches the string used for pagination */
export type PaginationCursor = string | null

/** Params sent to paginated RPCs */
export interface PaginationParams {
  limit?: number
  cursor?: PaginationCursor
}

/** Flat array returned by all paginated RPCs */
export type PaginatedResult<T> = T[]

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
