'use client'

import { Suspense } from 'react'
import { LoginContainer } from '@/containers/auth/LoginContainer'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LoginContainer />
    </Suspense>
  )
}
