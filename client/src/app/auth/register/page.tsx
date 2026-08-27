'use client'

import { Suspense } from 'react'
import { RegisterContainer } from '@/containers/auth/RegisterContainer'

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <RegisterContainer />
    </Suspense>
  )
}
