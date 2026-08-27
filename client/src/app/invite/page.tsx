'use client'

import { Suspense } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { InviteContainer } from '@/containers/invite/InviteContainer'

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="max-w-md mx-auto text-center py-12 text-gray-500">Loading...</div>
        </AppLayout>
      }
    >
      <AppLayout>
        <InviteContainer />
      </AppLayout>
    </Suspense>
  )
}
