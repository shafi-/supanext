'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { adminService } from '@/services/AdminService'

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

    const { data } = await adminService.isSystemAdmin()
    setIsSystemAdmin(data === true)
    setLoading(false)
  }, [user])

  useEffect(() => {
    checkAdmin()
  }, [checkAdmin])

  return { isSystemAdmin, loading, refetch: checkAdmin }
}
