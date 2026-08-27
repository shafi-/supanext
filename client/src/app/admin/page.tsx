'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import AdminDashboardContainer from '@/containers/admin/AdminDashboardContainer'

export default function AdminPage() {
  return (
    <AppLayout>
      <AdminDashboardContainer />
    </AppLayout>
  )
}
