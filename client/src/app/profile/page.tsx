'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { ProfileContainer } from '@/containers/profile/ProfileContainer'

export default function ProfilePage() {
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <ProfileContainer />
      </div>
    </AppLayout>
  )
}
