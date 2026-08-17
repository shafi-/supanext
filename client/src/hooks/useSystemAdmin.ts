'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { supabaseManager } from '@/lib/supabase'

export function useSystemAdmin() {
  const { user } = useAuth()
  const [isSystemAdmin, setIsSystemAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const checkAdmin = useCallback(async () => {
    if (!user) {
      setIsSystemAdmin(false)
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabaseManager.getClient()
        .from('profiles')
        .select('is_system_admin')
        .eq('id', user.id)
        .single()

      if (error) {
        setIsSystemAdmin(false)
      } else {
        setIsSystemAdmin((data as Record<string, unknown>)?.is_system_admin === true)
      }
    } catch {
      setIsSystemAdmin(false)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    checkAdmin()
  }, [checkAdmin])

  return { isSystemAdmin, loading, refetch: checkAdmin }
}
