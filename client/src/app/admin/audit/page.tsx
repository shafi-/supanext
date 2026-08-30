'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import AdminAuditLogContainer from '@/containers/admin/AdminAuditLogContainer'

export default function AdminAuditLogPage() {
  return (
    <AppLayout>
      <AdminAuditLogContainer />
    </AppLayout>
  )
}
