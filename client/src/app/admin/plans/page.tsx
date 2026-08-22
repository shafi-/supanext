'use client'

import { AppLayout } from '@/components/layout/AppLayout'
import { subscriptionPlanService } from '@/services/SubscriptionPlanService'
import { useSystemAdmin } from '@/hooks/useSystemAdmin'
import { useState, useEffect, useCallback } from 'react'
import type { SubscriptionPlan } from '@/types'
import Link from 'next/link'

export default function AdminPlansPage() {
  const { isSystemAdmin, loading: adminLoading } = useSystemAdmin()
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    price_monthly: 0,
    price_yearly: 0,
    features: '',
  })
  const [saving, setSaving] = useState(false)

  const loadPlans = useCallback(async () => {
    const { data } = await subscriptionPlanService.getPlans(true)
    if (data) setPlans(data as unknown as SubscriptionPlan[])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isSystemAdmin) loadPlans()
  }, [isSystemAdmin, loadPlans])

  const handleCreate = async () => {
    setSaving(true)
    const features = form.features.split(',').map(f => f.trim()).filter(Boolean)
    const { error } = await subscriptionPlanService.createPlan(
      form.name,
      form.description,
      form.price_monthly,
      form.price_yearly,
      features
    )
    if (!error) {
      setShowCreate(false)
      setForm({ name: '', description: '', price_monthly: 0, price_yearly: 0, features: '' })
      loadPlans()
    }
    setSaving(false)
  }

  const handleUpdate = async () => {
    if (!editingPlan) return
    setSaving(true)
    const features = form.features.split(',').map(f => f.trim()).filter(Boolean)
    const { error } = await subscriptionPlanService.updatePlan(editingPlan.id, {
      name: form.name,
      description: form.description,
      price_monthly: form.price_monthly,
      price_yearly: form.price_yearly,
      features,
    })
    if (!error) {
      setEditingPlan(null)
      setForm({ name: '', description: '', price_monthly: 0, price_yearly: 0, features: '' })
      loadPlans()
    }
    setSaving(false)
  }

  const handleToggleActive = async (plan: SubscriptionPlan) => {
    await subscriptionPlanService.updatePlan(plan.id, { is_active: !plan.is_active })
    loadPlans()
  }

  const openEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan)
    setForm({
      name: plan.name,
      description: plan.description || '',
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      features: (plan.features || []).join(', '),
    })
  }

  if (adminLoading) return <AppLayout><div>Loading...</div></AppLayout>

  if (!isSystemAdmin) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">You don&apos;t have permission to access this page.</p>
          <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">Back to home</Link>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/admin" className="text-sm text-gray-500 hover:underline">← Back to Admin</Link>
            <h1 className="text-2xl font-bold mt-2">Subscription Plans</h1>
          </div>
          <button
            onClick={() => { setShowCreate(true); setEditingPlan(null); setForm({ name: '', description: '', price_monthly: 0, price_yearly: 0, features: '' }) }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Create Plan
          </button>
        </div>

        {(showCreate || editingPlan) && (
          <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <h2 className="text-lg font-semibold">{editingPlan ? 'Edit Plan' : 'Create Plan'}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="mt-1 block w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="mt-1 block w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Price Monthly ($)</label>
                <input
                  type="number"
                  value={form.price_monthly}
                  onChange={e => setForm({ ...form, price_monthly: Number(e.target.value) })}
                  className="mt-1 block w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Price Yearly ($)</label>
                <input
                  type="number"
                  value={form.price_yearly}
                  onChange={e => setForm({ ...form, price_yearly: Number(e.target.value) })}
                  className="mt-1 block w-full border rounded px-3 py-2"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Features (comma-separated)</label>
                <input
                  type="text"
                  value={form.features}
                  onChange={e => setForm({ ...form, features: e.target.value })}
                  placeholder="todos, members, invites, settings, analytics"
                  className="mt-1 block w-full border rounded px-3 py-2"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={editingPlan ? handleUpdate : handleCreate}
                disabled={saving || !form.name}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingPlan ? 'Update' : 'Create'}
              </button>
              <button
                onClick={() => { setShowCreate(false); setEditingPlan(null) }}
                className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Description</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Monthly</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Yearly</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Features</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {plans.map(plan => (
                  <tr key={plan.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{plan.name}</td>
                    <td className="px-4 py-3 text-gray-600">{plan.description || '-'}</td>
                    <td className="px-4 py-3">${plan.price_monthly}/mo</td>
                    <td className="px-4 py-3">${plan.price_yearly}/yr</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(plan.features || []).map(f => (
                          <span key={f} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">{f}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded ${plan.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {plan.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(plan)} className="text-blue-600 hover:underline text-sm">Edit</button>
                        <button onClick={() => handleToggleActive(plan)} className="text-orange-600 hover:underline text-sm">
                          {plan.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {plans.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No plans yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
