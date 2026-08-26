'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { adminService } from '@/services/AdminService'
import { useSystemAdmin } from '@/hooks/useSystemAdmin'
import { useCallback, useState, useEffect } from 'react'
import Link from 'next/link'

interface AdminPlan {
  id: string
  code: string
  name: string
  description: string | null
  price_minor: number
  currency: string
  billing_interval: string
  is_active: boolean
  features: string[]
}

export default function AdminPlansPage() {
  const { isSystemAdmin, loading: adminLoading } = useSystemAdmin()
  const [plans, setPlans] = useState<AdminPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    price: '0',
    currency: 'USD',
    billingInterval: 'month',
    featureCode: '',
  })

  const refresh = useCallback(async () => {
    const { data, error: err } = await adminService.listPlans()
    if (data) setPlans(data)
    setError(err)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isSystemAdmin) void refresh()
  }, [isSystemAdmin, refresh])

  if (adminLoading) return <AppLayout><div>Loading...</div></AppLayout>

  if (!isSystemAdmin) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">Back to home</Link>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Subscription Plans</h1>
          <button onClick={() => setShowCreate(!showCreate)}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
            {showCreate ? 'Cancel' : 'New Plan'}
          </button>
        </div>
        {error && <p className="text-red-600">{error}</p>}

        {showCreate && (
          <div className="bg-white p-4 rounded-lg shadow space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input placeholder="code" value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="border rounded px-2 py-1.5 text-sm" />
              <input placeholder="name" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border rounded px-2 py-1.5 text-sm" />
              <input placeholder="price (minor units)" type="number" value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="border rounded px-2 py-1.5 text-sm" />
              <select value={form.billingInterval}
                onChange={(e) => setForm({ ...form, billingInterval: e.target.value })}
                className="border rounded px-2 py-1.5 text-sm">
                <option value="month">month</option>
                <option value="year">year</option>
                <option value="one_time">one_time</option>
              </select>
            </div>
            <input placeholder="description" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border rounded px-2 py-1.5 text-sm" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Initial feature code:</span>
              <input placeholder="e.g. fundraising" value={form.featureCode}
                onChange={(e) => setForm({ ...form, featureCode: e.target.value })}
                className="border rounded px-2 py-1.5 text-sm flex-1" />
              <button onClick={async () => {
                setSaving(true)
                const created = await adminService.createPlan({
                  code: form.code,
                  name: form.name || form.code,
                  description: form.description,
                  priceMinor: parseInt(form.price) || 0,
                  currency: form.currency,
                  billingInterval: form.billingInterval as 'month' | 'year' | 'one_time',
                })
                if (created.error) setError(created.error)
                else if (created.data && form.featureCode.trim()) {
                  const f = await adminService.setPlanFeature(created.data, form.featureCode.trim(), true)
                  if (f.error) setError(f.error)
                }
                setSaving(false)
                setShowCreate(false)
                setForm({ code: '', name: '', description: '', price: '0', currency: 'USD', billingInterval: 'month', featureCode: '' })
                await refresh()
              }} disabled={saving}
                className="px-3 py-1.5 bg-green-600 text-white rounded-md text-sm disabled:opacity-50">
                {saving ? 'Saving…' : 'Create Plan'}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Billing</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Features</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Toggle Feature</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {plans.map((plan) => (
                  <tr key={plan.id}>
                    <td className="px-4 py-3">
                      <span className="font-medium">{plan.name}</span>
                      <span className="block text-xs text-gray-400">{plan.code}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {(plan.price_minor / 100).toFixed(2)} {plan.currency}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{plan.billing_interval}</td>
                    <td className="px-4 py-3 text-sm">{plan.features.join(', ') || '—'}</td>
                    <td className="px-4 py-3">
                      <FeatureToggle planId={plan.id} onDone={refresh} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Link href="/admin" className="text-blue-600 hover:underline inline-block">← Admin home</Link>
      </div>
    </AppLayout>
  )
}

function FeatureToggle({ planId, onDone }: { planId: string; onDone: () => Promise<void> }) {
  const [code, setCode] = useState('')
  return (
    <span className="inline-flex items-center gap-1">
      <input placeholder="feature code" value={code}
        onChange={(e) => setCode(e.target.value)}
        className="border rounded px-1.5 py-1 text-xs w-28" />
      <button onClick={async () => {
        if (!code.trim()) return
        // enable feature on this plan (idempotent — already-enabled is a no-op)
        void adminService.setPlanFeature(planId, code.trim(), true).then(onDone)
        setCode('')
      }} className="text-blue-600 text-xs hover:text-blue-800">enable</button>
    </span>
  )
}
