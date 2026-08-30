import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Validate environment variables
if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

// Create Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
})

// Get current session
export async function getCurrentSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) {
    console.error('Error getting session:', error.message)
    return null
  }

  return session
}

// Get current user
export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    console.error('Error getting user:', error.message)
    return null
  }

  return user
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const session = await getCurrentSession()
  return session !== null
}

// Get user ID from session
export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser()
  return user?.id || null
}

// Supabase client manager class
export class SupabaseClientManager {
  private static instance: SupabaseClientManager

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): SupabaseClientManager {
    if (!SupabaseClientManager.instance) {
      SupabaseClientManager.instance = new SupabaseClientManager()
    }
    return SupabaseClientManager.instance
  }

  public getClient() {
    return supabase
  }

  public async getSession() {
    return getCurrentSession()
  }

  public async getUser() {
    return getCurrentUser()
  }

  public async getUserId(): Promise<string | null> {
    return getCurrentUserId()
  }

  public async isAuthenticated(): Promise<boolean> {
    return isAuthenticated()
  }

  // Auth methods
  public async signIn(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password })
  }

  public async signUp(
    email: string,
    password: string,
    metadata?: Record<string, string>
  ) {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    })
  }

  public async signOut() {
    return supabase.auth.signOut()
  }

  public async resetPassword(email: string) {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
  }

  /**
   * Database function wrapper.
   * All functions live in the exposed `api` schema; .schema() makes PostgREST
   * route via Accept-Profile/Content-Profile headers automatically.
   */
  public async rpc<T = unknown>(
    functionName: keyof Database['api']['Functions'],
    params?: Record<string, unknown>
  ): Promise<{ data: T | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .schema('api')
        .rpc(functionName, params)

      if (error) {
        console.error(`RPC error (${functionName}):`, error.message)
        return { data: null, error: error.message }
      }

      return { data: data as T, error: null }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      console.error(`RPC catch error (${functionName}):`, errorMessage)
      return { data: null, error: errorMessage }
    }
  }
}

// Export singleton instance
export const supabaseManager = SupabaseClientManager.getInstance()
