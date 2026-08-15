export type ServiceData<T> = Promise<{
  data: T | null
  error: string | null
}>

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}
