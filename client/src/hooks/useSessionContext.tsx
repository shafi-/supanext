'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import type { SessionContext } from '@/types/session'
import { BaseRepository } from '@/repositories/BaseRepository'
import { Rpc } from '@/types/rpc'

interface SessionContextType {
  displayName: string | null
  isSystemAdmin: boolean
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

class SessionService extends BaseRepository {
  async getSessionContext() {
    return this.callRpc<SessionContext>(Rpc.Session.GetContext)
  }
}

const sessionService = new SessionService()

export function SessionContextProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [isSystemAdmin, setIsSystemAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await sessionService.getSessionContext()
    if (err) setError(err)
    if (data) {
      setDisplayName(data.display_name || null)
      setIsSystemAdmin(data.is_system_admin === true)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <SessionContext.Provider
      value={{ displayName, isSystemAdmin, loading, error, refresh }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSessionContext() {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error(
      'useSessionContext must be used within a SessionContextProvider'
    )
  }
  return context
}
