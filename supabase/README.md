# Supabase Database Architecture

This directory contains the database migrations, edge functions, and configuration for the Supabase backend following a **function-first architecture**.

## Architecture Overview

This project implements a database-driven architecture where:

- **All database operations go through functions** - No direct table access from client code
- **Restrictive RLS by default** - All tables use "deny all" policies with function-based access
- **Business logic encapsulated in PostgreSQL** - Complex rules live in database functions
- **Selective RLS for complex filtering** - Where functions aren't ideal, targeted RLS policies
- **Comprehensive audit logging** - All important actions tracked automatically

## Philosophy: Database as Application Backend

Instead of treating PostgreSQL as just data storage, we treat it as an application server that provides:

1. **API-like Functions** - Each function acts like a well-defined API endpoint
2. **Security by Default** - RLS carries authorization; callable functions are `SECURITY INVOKER` by default, with a short documented exception list
3. **Data Integrity** - Constraints, triggers, and validation at the source
4. **Single Source of Truth** - Business rules live in one place
5. **Performance** - Complex operations happen where the data lives

## Core Principles

### 1. Function-First Access
```sql
-- ❌ Never do this from client code:
SELECT * FROM user_campaigns WHERE user_id = 'xyz';

-- ✅ Always do this:
SELECT * FROM list_my_campaigns(p_limit => 20);
```

### 2. Security Through Functions
```sql
-- Functions run as the calling user (SECURITY INVOKER) —
-- RLS enforces authorization; functions add business validation:
CREATE OR REPLACE FUNCTION update_campaign(p_campaign_id UUID, ...)
LANGUAGE plpgsql SECURITY INVOKER AS $$
  -- Check ownership inside function
  IF NOT EXISTS (
    SELECT 1 FROM user_campaigns WHERE id = p_campaign_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Campaign not found or access denied';
  END IF;
  -- Proceed with operation
$$

-- SECURITY DEFINER is reserved for documented exceptions ONLY:
--   1. Triggers / auth handler (run outside user context)
--   2. RLS recursion anchors (is_system_admin, private.* helpers)
--   3. Anon pre-auth reads (validate_invite)
--   4. Privileged-column writers with internal guards
--      (grant/revoke/bootstrap_system_admin)
```

### 3. Restrictive Default Policies
```sql
-- All tables have "deny all" by default:
CREATE POLICY "deny_all_campaigns" ON user_campaigns FOR ALL USING (false);

-- Permissive policies re-open exactly what functions need:
CREATE POLICY "own_campaigns" ON user_campaigns FOR SELECT USING (
  user_id = auth.uid()
);
CREATE POLICY "admin_all_campaigns" ON user_campaigns FOR SELECT USING (
  is_system_admin(auth.uid())
);
-- Callable functions stay SECURITY INVOKER and resolve rows through RLS.
```

## Table Structure

### Core Tables

- **`profiles`** - Extends auth.users with additional user information
- **`user_campaigns`** - User-owned campaign resources
- **`subscription_plans`** - Available subscription tiers
- **`user_subscriptions`** - Per-user subscription assignments
- **`platform_invitations`** - Admin-to-user invitations with plan assignment

### Relationships

```
auth.users → profiles (1:1)
auth.users → user_campaigns (1:N)
auth.users → user_subscriptions (1:1)
auth.users → platform_invitations (1:N, as inviter or invitee)
subscription_plans → user_subscriptions (1:N)
subscription_plans → platform_invitations (1:N)
```

## Function Categories

### User Profile Functions
- `get_session_context()` - Get current user's display name and admin status
- `update_my_profile(full_name, avatar_url, metadata)` - Update own profile

### Campaign Functions (User-Owned)
- `list_my_campaigns(p_limit, p_cursor)` - List own campaigns (paginated)
- `create_campaign(p_name, p_description, p_goal_minor, p_currency, p_starts_at, p_ends_at)` - Create campaign
- `update_campaign(p_campaign_id, p_name, p_description, ...)` - Update own campaign
- `delete_campaign(p_campaign_id)` - Delete own campaign

### Subscription Functions
- `get_my_subscription()` - Get own subscription details + features
- `assign_user_subscription(p_user_id, p_plan_id, p_billing_period)` - Admin: assign subscription
- `deactivate_user_subscription(p_user_id)` - Admin: cancel subscription
- `has_feature(p_feature)` - Check if current user has a subscription feature

### Plan Management (System Admin)
- `create_plan(p_name, p_description, p_price_monthly, p_price_yearly, p_features)` - Create plan
- `set_plan_feature(p_plan_id, p_feature, p_enabled)` - Toggle plan feature
- `list_plans()` - List all plans
- `list_all_subscriptions()` - List all user subscriptions with plan details

### Invitation Functions (System Admin)
- `invite_platform_user(p_email, p_plan_id, p_billing_period)` - Send invitation
- `accept_platform_invitation(p_token)` - Accept invitation (sets up subscription)
- `revoke_platform_invitation(p_invitation_id)` - Revoke pending invitation
- `get_platform_invitation_preview(p_token)` - Preview invitation details

### Admin Functions
- `list_all_users()` - List all registered users with profiles

### System Admin Management
- `bootstrap_system_admin(p_email)` - Create first system admin (zero-admin bootstrapping)
- `grant_system_admin(p_user_id)` - Grant admin status
- `revoke_system_admin(p_user_id)` - Revoke admin status

## Usage Examples

### Creating a Campaign

```typescript
// From container code:
const { data, error } = await campaignService.createCampaign({
  name: 'My Campaign',
  description: 'A new campaign',
  goalMinor: 5000, // $50.00
  currency: 'USD',
});
```

### Checking Subscription Features

```typescript
// In container
const { subscription, hasFeature } = useSubscription()

// Feature gating
if (hasFeature('advanced_analytics')) {
  render <AdvancedAnalytics />
}
```

## Service Layer Integration

Your service layer becomes thin wrappers around database functions:

```typescript
class CampaignService extends BaseRepository {
  async listCampaigns(params?: PaginationParams) {
    return this.callRpc<PaginatedResponse<Campaign>>(Rpc.Campaign.ListMy, {
      p_limit: params?.limit ?? 20,
      p_cursor: params?.cursor,
    });
  }

  async createCampaign(input: CreateCampaignInput) {
    return this.callRpc<string>(Rpc.Campaign.Create, {
      p_name: input.name,
      p_description: input.description,
      p_goal_minor: input.goalMinor,
      p_currency: input.currency,
    });
  }
}
```

## Security Model

### Authentication
- Supabase Auth handles user authentication
- `auth.uid()` provides the current user's ID in functions
- User creation triggers automatic profile creation

### Authorization
- **Function-level**: Each function implements its own permission checks
- **RLS policies**: Row-level security for direct table access (selective)
- **RAISE EXCEPTION**: For unauthorized access attempts

### Audit Logging
- Automatic logging of all important actions
- Triggers on table changes for comprehensive tracking
- IP addresses and user agents captured for security analysis

## Development Workflow

### Local Development

```bash
# Start Supabase local development
supabase start

# Apply migrations
supabase db reset

# Access database directly
psql 'postgresql://postgres:postgres@localhost:54322/postgres'

# Generate TypeScript types from schema
supabase gen types typescript > src/types/database.ts
```

### Migration Management

```bash
# Create new migration
supabase migration new migration_name

# Apply migrations locally
supabase db reset

# Push to remote
supabase db push

# Check migration status
supabase migration list
```

### Testing Functions

```sql
-- Test function with specific user (development only):
SET LOCAL request.jwt.claim.sub = 'user-uuid';

SELECT * FROM list_my_campaigns(p_limit => 10);

-- Test admin functions:
SELECT list_all_users();
SELECT list_plans();
```

## SECURITY DEFINER

Exception classes only (INVOKER-first rule — everything else is INVOKER):

- **Triggers / auth handler**: `handle_new_user`, `audit_action`, `audit_table_changes`, `update_updated_at_column` (execute revoked from every role)
- **RLS recursion anchors**: `is_system_admin()`, `private.find_valid_invite()`, `private.has_pending_invite()`, `private.find_user_id_by_email()` (consulted inside policy expressions; boolean/UUID-only exposure)
- **Anon pre-auth reads**: `validate_invite`
- **Privileged-column writers** (sole writers of `profiles.is_system_admin`, each guarded by an internal `is_system_admin()` check): `grant_system_admin`, `revoke_system_admin`, `bootstrap_system_admin` (one-shot, advisory-locked)

## SECURITY INVOKER

All CRUD and read functions — RLS handles authorization via policies and ownership checks.

## Best Practices

1. **Always use functions** - Never query tables directly from client code
2. **Validate inputs** - Functions should validate all parameters
3. **Use transactions** - For complex operations requiring atomicity
4. **Return structured data** - Use views for consistent return types
5. **Handle errors gracefully** - Provide clear error messages
6. **Log important actions** - Use audit functions for compliance
7. **Test thoroughly** - Test functions with various permission scenarios
8. **Document functions** - Keep function documentation up to date

## Contributing

When adding new features:

1. Create database functions first, then application code
2. Follow existing naming conventions and patterns
3. Include proper authorization checks in functions
4. Add audit logging for important operations
5. Update views if return types change
6. Test with different user roles and permissions
7. Document new functions in this README

---

**Note**: This architecture prioritizes security and maintainability over development speed for complex operations. For simple, user-owned data, selective direct RLS can be more appropriate.
