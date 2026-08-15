'use client'

import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { supabaseManager } from '@/lib/supabase'
import type { AuthUser, AuthState } from '@/types'

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    supabaseManager.getClient().auth.getSession().then(({ data: { session } }) => {
      setState({
        user: session?.user ? { id: session.user.id, email: session.user.email ?? '' } : null,
        loading: false,
        error: null,
      })
    })

    const { data: { subscription } } = supabaseManager.getClient().auth.onAuthStateChange((_event, session) => {
      setState({
        user: session?.user ? { id: session.user.id, email: session.user.email ?? '' } : null,
        loading: false,
        error: null,
      })
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabaseManager.getClient().auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    const { error } = await supabaseManager.getClient().auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    return { error: error?.message ?? null }
  }, [])

  const signOut = useCallback(async () => {
    await supabaseManager.getClient().auth.signOut()
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabaseManager.getClient().auth.resetPasswordForEmail(email)
    return { error: error?.message ?? null }
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function useRequireAuth() {
  const auth = useAuth()
  if (!auth.loading && !auth.user) {
    window.location.href = '/auth/login'
  }
  return auth
}
