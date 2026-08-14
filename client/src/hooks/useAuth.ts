'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseManager } from '@/lib/supabase'
import type { AuthContextType, AuthUser, RequireAuthOptions } from '@/types'

// Create auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Auth Provider Props
interface AuthProviderProps {
  children: ReactNode
}

/**
 * Auth Provider Component
 * Provides authentication context to the application
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Initialize auth state
  useEffect(() => {
    let mounted = true

    async function initializeAuth() {
      try {
        setLoading(true)

        // Get current session
        const session = await supabaseManager.getSession()

        if (session?.user) {
          const userData: AuthUser = {
            id: session.user.id,
            email: session.user.email!,
            full_name: session.user.user_metadata?.full_name,
            avatar_url: session.user.user_metadata?.avatar_url,
          }
          setUser(userData)
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        setUser(null)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabaseManager.getClient().auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        if (session?.user) {
          const userData: AuthUser = {
            id: session.user.id,
            email: session.user.email!,
            full_name: session.user.user_metadata?.full_name,
            avatar_url: session.user.user_metadata?.avatar_url,
          }
          setUser(userData)
        } else {
          setUser(null)
        }

        setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabaseManager.signIn(email, password)

      if (error) {
        throw error
      }

      if (data.user) {
        const userData: AuthUser = {
          id: data.user.id,
          email: data.user.email!,
          full_name: data.user.user_metadata?.full_name,
          avatar_url: data.user.user_metadata?.avatar_url,
        }
        setUser(userData)
      }

      router.push('/dashboard')
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Sign up function
  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      setLoading(true)

      const metadata = fullName ? { full_name: fullName } : undefined

      const { data, error } = await supabaseManager.signUp(email, password, metadata)

      if (error) {
        throw error
      }

      if (data.user) {
        const userData: AuthUser = {
          id: data.user.id,
          email: data.user.email!,
          full_name: data.user.user_metadata?.full_name,
          avatar_url: data.user.user_metadata?.avatar_url,
        }
        setUser(userData)
      }

      router.push('/dashboard')
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Sign out function
  const signOut = async () => {
    try {
      setLoading(true)
      await supabaseManager.signOut()
      setUser(null)
      router.push('/')
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Reset password function
  const resetPassword = async (email: string) => {
    try {
      setLoading(true)
      const { error } = await supabaseManager.resetPassword(email)

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Reset password error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Hook to use auth context
 * @throws Error if used outside AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

/**
 * Hook to require authentication
 * Redirects to login if user is not authenticated
 */
export function useRequireAuth(options?: RequireAuthOptions) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push(options?.redirectTo || '/auth/login')
    }
  }, [user, loading, router])

  return { user, loading, isAuthenticated: !!user }
}

/**
 * Hook to check if user has specific role
 * This is a client-side hook - actual authorization happens in database functions
 */
export function useHasRole(requiredRoles: string[]) {
  const { user, loading } = useAuth()

  // This is a simplified version
  // In production, you would make a database call to check actual roles
  const hasRole = user && requiredRoles.length === 0 // Placeholder for actual role checking

  return { hasRole, loading }
}

/**
 * Hook to check organization membership
 * This is a client-side hook - actual authorization happens in database functions
 */
export function useOrganizationMember(organizationId: string) {
  const { user, loading } = useAuth()
  const [isMember, setIsMember] = useState(false)

  useEffect(() => {
    async function checkMembership() {
      if (!user || !organizationId) {
        setIsMember(false)
        return
      }

      try {
        const { data } = await supabaseManager.rpc('is_member', {
          check_user_id: user.id,
          check_org_id: organizationId,
        })

        setIsMember(data || false)
      } catch (error) {
        console.error('Error checking membership:', error)
        setIsMember(false)
      }
    }

    checkMembership()
  }, [user, organizationId])

  return { isMember, loading }
}