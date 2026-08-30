'use client'

import { Suspense } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { InviteContainer } from '@/containers/invite/InviteContainer'

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="mx-auto max-w-md py-12 text-center text-gray-500">
            Loading...
          </div>
        </AppLayout>
      }
    >
      <AppLayout>
        <InviteContainer />
      </AppLayout>
    </Suspense>
  )
}
