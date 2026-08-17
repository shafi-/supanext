# Subscription Management — Implementation Task

## Overview

System admins create subscription packages. Org owners subscribe/upgrade/downgrade for their org (simulated payment). System admins can pause/unpause. Only one active subscription per org. Org users see features based on active subscription.

## Role Access

| Role | Access |
|------|--------|
| System Admin | Create/edit packages, view all org subs, pause/unpause, billing history |
| Org Owner | Subscribe/upgrade/downgrade, view current plan, pay (simulated) |
| Org Admin | No subscription access |
| Org User | Sees features based on active subscription |

## Database Schema (3 tables)

### subscription_plans

```sql
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC DEFAULT 0,
  price_yearly NUMERIC DEFAULT 0,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### organization_subscriptions

```sql
CREATE TABLE organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active',  -- active, paused, expired, cancelled
  billing_period TEXT NOT NULL DEFAULT 'monthly',  -- monthly, yearly
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### subscription_history

```sql
CREATE TABLE subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  action TEXT NOT NULL,  -- subscribed, upgraded, downgraded, expired, renewed, payment
  amount NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'paid',  -- paid, pending, failed
  invoice_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Database Functions (10)

### System Admin (7)

```sql
-- Create subscription package
create_subscription_plan(
  p_name TEXT, p_description TEXT,
  p_price_monthly NUMERIC, p_price_yearly NUMERIC,
  p_features JSONB
) RETURNS subscription_plans

-- Update package
update_subscription_plan(
  p_plan_id UUID, p_name TEXT, p_description TEXT,
  p_price_monthly NUMERIC, p_price_yearly NUMERIC,
  p_features JSONB, p_is_active BOOLEAN
) RETURNS subscription_plans

-- List all packages
get_subscription_plans() RETURNS SETOF subscription_plans

-- All org subscriptions with plan details
get_organization_subscriptions() RETURNS TABLE(
  id, organization_id, org_name, plan_name,
  status, billing_period, price_monthly, price_yearly,
  current_period_start, current_period_end, created_at
)

-- Billing history for an org
get_subscription_history(p_org_id UUID) RETURNS TABLE(
  id, organization_id, org_name, plan_name,
  action, amount, payment_status, invoice_number, notes, created_at
)

-- Pause an org's subscription
pause_subscription(p_org_id UUID) RETURNS BOOLEAN
-- Sets status = 'paused', records history

-- Resume a paused subscription
unpause_subscription(p_org_id UUID) RETURNS BOOLEAN
-- Sets status = 'active', records history
```

### Org Owner (4)

```sql
-- Subscribe to plan (expires existing active subscription)
subscribe_to_plan(
  p_org_id UUID, p_plan_id UUID, p_billing_period TEXT
) RETURNS organization_subscriptions
-- 1. Expire existing active sub (status = 'expired')
-- 2. Create new active sub
-- 3. Record history entry

-- Upgrade/downgrade (expires old, creates new)
change_plan(
  p_org_id UUID, p_new_plan_id UUID, p_billing_period TEXT
) RETURNS organization_subscriptions
-- Same flow as subscribe_to_plan

-- Cancel subscription
cancel_subscription(p_org_id UUID) RETURNS BOOLEAN
-- Sets status = 'cancelled', records history

-- View current active subscription
get_my_subscription(p_org_id UUID) RETURNS TABLE(
  id, plan_id, plan_name, description,
  price_monthly, price_yearly, features,
  status, billing_period,
  current_period_start, current_period_end
)
```

### Feature Check (1)

```sql
-- Check if org has a specific feature
has_feature(p_org_id UUID, p_feature TEXT) RETURNS BOOLEAN
-- Joins organization_subscriptions + subscription_plans
-- Returns true if active subscription's features array contains p_feature
```

## TypeScript Types

```typescript
// client/src/types/subscription.ts

export interface SubscriptionPlan {
  id: string
  name: string
  description: string | null
  price_monthly: number
  price_yearly: number
  features: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface OrganizationSubscription {
  id: string
  organization_id: string
  plan_id: string
  status: 'active' | 'paused' | 'expired' | 'cancelled'
  billing_period: 'monthly' | 'yearly'
  current_period_start: string
  current_period_end: string
  created_at: string
  updated_at: string
}

export interface OrganizationSubscriptionView extends OrganizationSubscription {
  org_name: string
  plan_name: string
  price_monthly: number
  price_yearly: number
}

export interface SubscriptionHistory {
  id: string
  organization_id: string
  plan_id: string
  action: 'subscribed' | 'upgraded' | 'downgraded' | 'expired' | 'renewed' | 'payment'
  amount: number
  payment_status: 'paid' | 'pending' | 'failed'
  invoice_number: string | null
  notes: string | null
  created_at: string
}

export interface SubscriptionHistoryView extends SubscriptionHistory {
  org_name: string
  plan_name: string
}

export interface CurrentSubscription {
  id: string
  plan_id: string
  plan_name: string
  description: string | null
  price_monthly: number
  price_yearly: number
  features: string[]
  status: string
  billing_period: string
  current_period_start: string
  current_period_end: string
}

export interface SubscribeDto {
  plan_id: string
  billing_period: 'monthly' | 'yearly'
}
```

## RPC Types

```typescript
// Add to client/src/types/rpc.ts

Subscription: {
  GetPlans: 'get_subscription_plans' satisfies DbFunction,
  CreatePlan: 'create_subscription_plan' satisfies DbFunction,
  UpdatePlan: 'update_subscription_plan' satisfies DbFunction,
  GetOrgSubscriptions: 'get_organization_subscriptions' satisfies DbFunction,
  GetHistory: 'get_subscription_history' satisfies DbFunction,
  Pause: 'pause_subscription' satisfies DbFunction,
  Unpause: 'unpause_subscription' satisfies DbFunction,
  Subscribe: 'subscribe_to_plan' satisfies DbFunction,
  ChangePlan: 'change_plan' satisfies DbFunction,
  Cancel: 'cancel_subscription' satisfies DbFunction,
  GetMy: 'get_my_subscription' satisfies DbFunction,
  HasFeature: 'has_feature' satisfies DbFunction,
}
```

## Services

### SubscriptionPlanService (system admin)

```typescript
export class SubscriptionPlanService extends BaseRepository {
  async getPlans(): ServiceData<SubscriptionPlan[]>
  async createPlan(data: CreatePlanDto): ServiceData<SubscriptionPlan>
  async updatePlan(planId: string, data: UpdatePlanDto): ServiceData<SubscriptionPlan>
  async getOrgSubscriptions(): ServiceData<OrganizationSubscriptionView[]>
  async getHistory(orgId: string): ServiceData<SubscriptionHistoryView[]>
  async pauseSubscription(orgId: string): ServiceData<boolean>
  async unpauseSubscription(orgId: string): ServiceData<boolean>
}
```

### SubscriptionService (org owner)

```typescript
export class SubscriptionService extends BaseRepository {
  async getMySubscription(orgId: string): ServiceData<CurrentSubscription>
  async subscribe(orgId: string, data: SubscribeDto): ServiceData<OrganizationSubscription>
  async changePlan(orgId: string, data: SubscribeDto): ServiceData<OrganizationSubscription>
  async cancel(orgId: string): ServiceData<boolean>
  async hasFeature(orgId: string, feature: string): ServiceData<boolean>
}
```

## useSubscription Hook

```typescript
// client/src/hooks/useSubscription.ts

export function useSubscription(orgId: string | null) {
  const [currentPlan, setCurrentPlan] = useState<CurrentSubscription | null>(null)
  const [loading, setLoading] = useState(true)

  const hasFeature = useCallback((feature: string): boolean => {
    return currentPlan?.features?.includes(feature) ?? false
  }, [currentPlan])

  // Load subscription on mount
  useEffect(() => {
    if (!orgId) { setLoading(false); return }
    subscriptionService.getMySubscription(orgId).then(...)
  }, [orgId])

  return { currentPlan, loading, hasFeature, refetch }
}
```

## Pages

### Admin: /admin/plans

- Table listing all plans (name, prices, features, active status)
- Create plan button → modal/form
- Edit/deactivate plan
- Feature input as comma-separated list or tag input

### Admin: /admin/subscriptions

- Table listing all org subscriptions (org name, plan, status, period, dates)
- Click row → view billing history for that org
- Pause/unpause button per row

### Org Detail: Billing Tab (owner only)

- Current plan display (name, price, features, status, renewal date)
- Available plans grid (free / pro / enterprise)
- "Pay Now" button per plan (simulated — creates subscription + records history)
- Upgrade/downgrade flow: shows price difference, confirms, old sub expires
- Billing history table

### Feature-Gating (all org tabs)

- Wrap tab rendering with `hasFeature()` check
- Example:
  ```tsx
  const { hasFeature } = useSubscription(orgId)
  {hasFeature('todos') && <TodosTab orgId={orgId} />}
  {hasFeature('members') && <MembersTab orgId={orgId} />}
  {hasFeature('settings') && <SettingsTab orgId={orgId} />}
  ```

## File Structure

```
New files:
├── client/src/types/subscription.ts
├── client/src/services/SubscriptionPlanService.ts
├── client/src/services/SubscriptionService.ts
├── client/src/hooks/useSubscription.ts
├── client/src/app/admin/plans/page.tsx
├── client/src/app/admin/subscriptions/page.tsx
├── client/src/components/subscription/BillingTab.tsx
└── supabase/migrations/<timestamp>_add_subscriptions.sql

Modified files:
├── client/src/types/rpc.ts           (add Subscription group)
├── client/src/types/index.ts         (re-export)
├── client/src/app/admin/page.tsx     (add nav links to plans/subscriptions)
├── client/src/app/orgs/page.tsx      (add Billing tab + feature-gate tabs)
└── client/src/hooks/usePermissions.ts (add billing permission for owner)
```

## Build Order

1. **Migration** — 3 tables + 10 functions + RLS + grants
2. **Types + RPC** — subscription.ts + rpc.ts updates
3. **Services** — SubscriptionPlanService + SubscriptionService
4. **useSubscription hook**
5. **Admin pages** — plans → subscriptions
6. **Org Billing tab** + feature-gating
7. **Nav updates** — admin links
8. **Tests** — E2E for subscription flow
