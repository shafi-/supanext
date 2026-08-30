import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface AdminPlan {
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

interface CreatePlanInput {
  code: string
  name: string
  description?: string
  priceMinor: number
  currency: string
  billingInterval: 'month' | 'year' | 'one_time'
  featureCode: string
}

interface AdminPlansViewProps {
  plans: AdminPlan[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  onLoadMore: () => void
  onCreatePlan: (input: CreatePlanInput) => Promise<string | null>
  onToggleFeature: (planId: string, featureCode: string) => Promise<void>
}

export function AdminPlansView({
  plans,
  loading,
  loadingMore,
  error,
  hasMore,
  onLoadMore,
  onCreatePlan,
  onToggleFeature,
}: AdminPlansViewProps) {
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    price: '0',
    currency: 'USD',
    billingInterval: 'month',
    featureCode: '',
  })

  const submit = async () => {
    setSaving(true)
    const err = await onCreatePlan({
      code: form.code,
      name: form.name || form.code,
      description: form.description,
      priceMinor: parseInt(form.price) || 0,
      currency: form.currency,
      billingInterval: form.billingInterval as 'month' | 'year' | 'one_time',
      featureCode: form.featureCode,
    })
    setSaving(false)
    if (!err) {
      setShowCreate(false)
      setForm({
        code: '',
        name: '',
        description: '',
        price: '0',
        currency: 'USD',
        billingInterval: 'month',
        featureCode: '',
      })
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Subscription Plans</h1>
        <Button
          size="sm"
          onClick={() => setShowCreate(!showCreate)}
          className="h-auto rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
        >
          {showCreate ? 'Cancel' : 'New Plan'}
        </Button>
      </div>
      {error && <p className="text-red-600">{error}</p>}

      {showCreate && (
        <div className="space-y-3 rounded-lg bg-white p-4 shadow">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Input
              placeholder="code"
              value={form.code}
              onChange={e => setForm({ ...form, code: e.target.value })}
              className="w-full rounded border px-2 py-1.5 text-sm"
            />
            <Input
              placeholder="name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full rounded border px-2 py-1.5 text-sm"
            />
            <Input
              placeholder="price (minor units)"
              type="number"
              value={form.price}
              onChange={e => setForm({ ...form, price: e.target.value })}
              className="w-full rounded border px-2 py-1.5 text-sm"
            />
            <select
              value={form.billingInterval}
              onChange={e =>
                setForm({ ...form, billingInterval: e.target.value })
              }
              className="rounded border px-2 py-1.5 text-sm"
            >
              <option value="month">month</option>
              <option value="year">year</option>
              <option value="one_time">one_time</option>
            </select>
          </div>
          <Input
            placeholder="description"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full rounded border px-2 py-1.5 text-sm"
          />
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Initial feature code:</span>
            <div className="flex-1">
              <Input
                placeholder="e.g. fundraising"
                value={form.featureCode}
                onChange={e =>
                  setForm({ ...form, featureCode: e.target.value })
                }
                className="w-full rounded border px-2 py-1.5 text-sm"
              />
            </div>
            <Button
              size="sm"
              onClick={submit}
              disabled={saving}
              className="h-auto rounded-md bg-green-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Create Plan'}
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Price
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Billing
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Features
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Toggle Feature
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {plans.map(plan => (
              <tr key={plan.id}>
                <td className="px-4 py-3">
                  <span className="font-medium">{plan.name}</span>
                  <span className="block text-xs text-gray-400">
                    {plan.code}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {(plan.price_minor / 100).toFixed(2)} {plan.currency}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {plan.billing_interval}
                </td>
                <td className="px-4 py-3 text-sm">
                  {plan.features.join(', ') || '—'}
                </td>
                <td className="px-4 py-3">
                  <FeatureToggle
                    planId={plan.id}
                    onToggleFeature={onToggleFeature}
                  />
                </td>
              </tr>
            ))}
            {hasMore && (
              <tr>
                <td colSpan={5} className="py-4 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onLoadMore}
                    disabled={loadingMore}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {loadingMore ? 'Loading...' : 'Load More'}
                  </Button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Link
        href="/admin"
        className="inline-block text-blue-600 hover:underline"
      >
        ← Admin home
      </Link>
    </div>
  )
}

function FeatureToggle({
  planId,
  onToggleFeature,
}: {
  planId: string
  onToggleFeature: (planId: string, featureCode: string) => Promise<void>
}) {
  const [code, setCode] = useState('')
  return (
    <div className="inline-flex items-center gap-1">
      <div className="w-28">
        <Input
          placeholder="feature code"
          value={code}
          onChange={e => setCode(e.target.value)}
          className="h-auto w-full rounded border px-1.5 py-1 text-xs"
        />
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={async () => {
          if (!code.trim()) return
          await onToggleFeature(planId, code.trim())
          setCode('')
        }}
        className="h-auto p-0 text-xs text-blue-600 hover:bg-transparent hover:text-blue-800"
      >
        enable
      </Button>
    </div>
  )
}
