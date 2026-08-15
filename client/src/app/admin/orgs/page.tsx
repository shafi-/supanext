'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { adminService } from '@/services/AdminService'
import { useState, useEffect } from 'react'
import type { OrganizationDetailView } from '@/types'

export default function AdminOrgsPage() {
  const [orgs, setOrgs] = useState<OrganizationDetailView[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await adminService.getAllOrgs()
      if (data) setOrgs(data)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">All Organizations</h1>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Members</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orgs.map((org) => (
                  <tr key={org.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{org.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{org.slug}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{org.member_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
