import type { Database } from './database'

// Application Types
export interface User {
  id: string
  email: string
  full_name?: string | null
  avatar_url?: string | null
  metadata?: Database['public']['Tables']['profiles']['Row']['metadata']
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  logo_url?: string | null
  description?: string | null
  settings: Database['public']['Tables']['organizations']['Row']['settings']
  created_at: string
  updated_at: string
  user_id?: string
  user_role?: string
  membership_status?: string
  joined_at?: string
}

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  email: string
  full_name?: string | null
  avatar_url?: string | null
  role: string
  status: string
  joined_at: string
  created_at: string
}

export interface Role {
  id: string
  name: string
  description?: string | null
  permissions: string[]
  is_system_role: boolean
  created_at: string
}

export interface AuditLog {
  id: string
  user_id?: string | null
  organization_id?: string | null
  action: string
  resource_type?: string | null
  resource_id?: string | null
  metadata?: Database['public']['Tables']['audit_logs']['Row']['metadata']
  ip_address?: string | null
  user_agent?: string | null
  created_at: string
}

// API Request/Response Types
export interface CreateOrganizationDto {
  name: string
  slug: string
  description?: string
  settings?: Record<string, unknown>
}

export interface UpdateOrganizationDto {
  name?: string
  slug?: string
  description?: string
  settings?: Record<string, unknown>
}

export interface AddMemberDto {
  organizationId: string
  email: string
  role: string
}

export interface UpdateProfileDto {
  full_name?: string
  avatar_url?: string
  metadata?: Record<string, unknown>
}

// Component Props Types
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

// Container State Types
export interface ContainerState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export interface PaginatedData<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// Auth Types
export interface AuthUser {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
}

export interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName?: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

export interface RequireAuthOptions {
  redirectTo?: string
  roles?: string[]
}

// Error Types
export interface ApiError {
  message: string
  code?: string
  details?: unknown
}

export interface ValidationError {
  field: string
  message: string
}

// Utility Types
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] }
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// Service Return Types
export type ServiceResult<T> = ContainerState<T>
export type ServiceData<T> = Promise<{ data: T | null; error: string | null }>
export type ServiceVoid = Promise<{ error: string | null }>