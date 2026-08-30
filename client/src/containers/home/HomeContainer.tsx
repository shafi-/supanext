'use client'

import { useAuth } from '@/hooks/useAuth'
import { HomeView } from '@/components/home/HomeView'

export function HomeContainer() {
  const { user, loading } = useAuth()
  return (
    <HomeView user={user ? { email: user.email } : null} loading={loading} />
  )
}
