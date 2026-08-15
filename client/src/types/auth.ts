export interface AuthUser {
  id: string
  email: string
}

export interface AuthSession {
  user: AuthUser
  access_token: string
  refresh_token: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials extends LoginCredentials {
  full_name?: string
}

export interface AuthState {
  user: AuthUser | null
  loading: boolean
  error: string | null
}
