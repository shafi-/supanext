'use client'

import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseManager } from '@/lib/supabase'
import type { AuthState } from '@/types'

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string, captchaToken?: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName?: string, captchaToken?: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string, captchaToken?: string) => Promise<{ error: string | null }>
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>
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

  const signIn = useCallback(async (email: string, password: string, captchaToken?: string) => {
    const { error } = await supabaseManager.getClient().auth.signInWithPassword({
      email,
      password,
      options: { captchaToken },
    })
    return { error: error?.message ?? null }
  }, [])

  const signUp = useCallback(async (email: string, password: string, fullName?: string, captchaToken?: string) => {
    const { error } = await supabaseManager.getClient().auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        captchaToken,
      },
    })
    return { error: error?.message ?? null }
  }, [])

  const signOut = useCallback(async () => {
    await supabaseManager.getClient().auth.signOut()
  }, [])

  const resetPassword = useCallback(async (email: string, captchaToken?: string) => {
    const { error } = await supabaseManager.getClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password/`,
      captchaToken,
    })
    return { error: error?.message ?? null }
  }, [])

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabaseManager.getClient().auth.updateUser({ password: newPassword })
    return { error: error?.message ?? null }
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut, resetPassword, updatePassword }}>
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
  const router = useRouter()

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      router.push('/auth/login/')
    }
  }, [auth.loading, auth.user, router])

  return auth
}
