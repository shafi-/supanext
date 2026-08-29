# Subscription Management

## Overview

System admins create subscription packages. Users subscribe to plans. System admins can assign/change/deactivate subscriptions for any user. Feature gating based on active subscription.

## Role Access

| Role | Access |
|------|--------|
| System Admin | Create/edit plans, assign subscriptions, view all subscriptions, manage invitations |
| User | View own subscription, see features based on plan |

## Database Schema

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

### user_subscriptions

```sql
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active',
  billing_period TEXT NOT NULL DEFAULT 'monthly',
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### platform_invitations

```sql
CREATE TABLE platform_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  billing_period TEXT NOT NULL DEFAULT 'monthly',
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Database Functions

### System Admin

```sql
-- Create subscription plan
create_plan(p_name, p_description, p_price_monthly, p_price_yearly, p_features)
  RETURNS subscription_plans

-- Set plan feature flag
set_plan_feature(p_plan_id, p_feature, p_enabled)
  RETURNS subscription_plans

-- List all plans
list_plans() RETURNS SETOF subscription_plans

-- Assign subscription to user
assign_user_subscription(p_user_id, p_plan_id, p_billing_period)
  RETURNS user_subscriptions

-- Deactivate user subscription
deactivate_user_subscription(p_user_id) RETURNS BOOLEAN

-- List all user subscriptions (admin view)
list_all_subscriptions() RETURNS TABLE(...)

-- Invite user with plan
invite_platform_user(p_email, p_plan_id, p_billing_period)
  RETURNS platform_invitations
```

### User

```sql
-- Get own subscription
get_my_subscription() RETURNS TABLE(...)

-- Accept invitation (by token)
accept_platform_invitation(p_token) RETURNS BOOLEAN
```

## RPC Types

```typescript
// client/src/types/rpc.ts

Subscription: {
  GetMy: 'get_my_subscription',
  Assign: 'assign_user_subscription',
  Deactivate: 'deactivate_user_subscription',
},
Plan: {
  Create: 'create_plan',
  SetFeature: 'set_plan_feature',
},
Admin: {
  ListAllUsers: 'list_all_users',
  ListAllSubscriptions: 'list_all_subscriptions',
  ListPlans: 'list_plans',
},
Invitation: {
  Invite: 'invite_platform_user',
  Accept: 'accept_platform_invitation',
  Revoke: 'revoke_platform_invitation',
  Preview: 'get_platform_invitation_preview',
},
```

## Feature Gating

```typescript
// In container
const { hasFeature } = useSubscription()

// In component
if (hasFeature('advanced_analytics')) {
  render <AdvancedAnalytics />
}
```

## File Structure

```
New files:
├── client/src/types/subscription.ts
├── client/src/services/SubscriptionService.ts
├── client/src/services/AdminService.ts
├── client/src/hooks/useSubscription.ts
├── client/src/app/admin/plans/page.tsx
├── client/src/app/admin/subscriptions/page.tsx
└── supabase/migrations/<timestamp>_user_centric_model.sql

Modified files:
├── client/src/types/rpc.ts           (Subscription + Plan + Admin groups)
├── client/src/types/index.ts         (re-export)
├── client/src/app/admin/page.tsx     (nav links to plans/subscriptions)
└── client/src/hooks/usePermissions.ts (hasFeature for feature gating)
```

## Build Order

1. **Migration** — tables + functions + RLS + grants
2. **Types + RPC** — subscription.ts + rpc.ts updates
3. **Services** — SubscriptionService + AdminService
4. **useSubscription hook**
5. **Admin pages** — plans -> subscriptions
6. **Feature gating** in containers
7. **Nav updates** — admin links
8. **Tests** — unit tests for services, E2E for subscription flow
