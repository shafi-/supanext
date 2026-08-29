'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import AdminUsersContainer from '@/containers/admin/AdminUsersContainer'

export default function AdminUsersPage() {
  return (
    <AppLayout>
      <AdminUsersContainer />
    </AppLayout>
  )
}
