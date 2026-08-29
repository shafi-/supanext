# Adding a Feature with CRUD

Step-by-step guide for adding a new user-owned resource with full CRUD. Uses the Campaign feature as a reference.

## Overview

Every feature follows this flow:

```
SQL migration → database.ts → rpc.ts → type → service → hook → container → component → page → test
```

## Step 1: SQL Migration

Create a new migration:

```bash
cd supabase && supabase migration new add_campaigns
```

Define the table, functions, and RLS policies:

```sql
-- Table
CREATE TABLE user_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  goal_minor INTEGER,
  currency TEXT DEFAULT 'USD',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE user_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_all" ON user_campaigns FOR ALL USING (false);
CREATE POLICY "own_campaigns_select" ON user_campaigns FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "own_campaigns_insert" ON user_campaigns FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_campaigns_update" ON user_campaigns FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "own_campaigns_delete" ON user_campaigns FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "admin_all" ON user_campaigns FOR ALL USING (is_system_admin(auth.uid()));

-- Functions
CREATE OR REPLACE FUNCTION list_my_campaigns(
  p_limit INTEGER DEFAULT 20,
  p_cursor TIMESTAMPTZ DEFAULT NULL
) RETURNS JSONB AS $$
  DECLARE
    result JSONB;
  BEGIN
    SELECT jsonb_build_object(
      'items', COALESCE(jsonb_agg(row_to_json(c)), '[]'::jsonb),
      'next_cursor', (
        SELECT MIN(created_at) FROM user_campaigns
        WHERE user_id = auth.uid()
        AND created_at < COALESCE(
          (SELECT MIN(created_at) FROM user_campaigns WHERE user_id = auth.uid() AND created_at < p_cursor),
          NOW()
        )
      )
    )
    INTO result
    FROM (
      SELECT * FROM user_campaigns
      WHERE user_id = auth.uid()
      AND (p_cursor IS NULL OR created_at < p_cursor)
      ORDER BY created_at DESC
      LIMIT p_limit + 1
    ) c;

    IF jsonb_array_length(result->'items') > p_limit THEN
      result := jsonb_set(result, '{items}',
        result->'items' - jsonb_array_length(result->'items') - 1
      );
    END IF;

    RETURN result;
  END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION create_campaign(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_goal_minor INTEGER DEFAULT NULL,
  p_currency TEXT DEFAULT 'USD',
  p_starts_at TIMESTAMPTZ DEFAULT NULL,
  p_ends_at TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID AS $$
  DECLARE
    v_id UUID;
  BEGIN
    INSERT INTO user_campaigns (user_id, name, description, goal_minor, currency, starts_at, ends_at)
    VALUES (auth.uid(), p_name, p_description, p_goal_minor, p_currency, p_starts_at, p_ends_at)
    RETURNING id INTO v_id;
    RETURN v_id;
  END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION update_campaign(
  p_campaign_id UUID,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_goal_minor INTEGER DEFAULT NULL,
  p_currency TEXT DEFAULT NULL,
  p_starts_at TIMESTAMPTZ DEFAULT NULL,
  p_ends_at TIMESTAMPTZ DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_campaigns WHERE id = p_campaign_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Campaign not found or access denied';
  END IF;

  UPDATE user_campaigns SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    goal_minor = COALESCE(p_goal_minor, goal_minor),
    currency = COALESCE(p_currency, currency),
    starts_at = COALESCE(p_starts_at, starts_at),
    ends_at = COALESCE(p_ends_at, ends_at),
    updated_at = NOW()
  WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION delete_campaign(p_campaign_id UUID) RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_campaigns WHERE id = p_campaign_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Campaign not found or access denied';
  END IF;

  DELETE FROM user_campaigns WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Grants (add to security hardening migration)
GRANT EXECUTE ON FUNCTION list_my_campaigns(INTEGER, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION create_campaign(TEXT, TEXT, INTEGER, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION update_campaign(UUID, TEXT, TEXT, INTEGER, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_campaign(UUID) TO authenticated;
```

Apply:

```bash
supabase db reset
```

## Step 2: Generate Types

```bash
cd supabase && supabase gen types typescript > ../client/src/types/database.ts
```

Verify the new functions appear in `Database['api']['Functions']`.

## Step 3: Type Definition

Create `client/src/types/campaign.ts`:

```typescript
/**
 * Campaign type definitions.
 * Single source of truth — service files re-export from here.
 */
export interface Campaign {
  id: string
  user_id: string
  name: string
  description: string | null
  goal_minor: number | null
  currency: string
  starts_at: string | null
  ends_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}
```

Re-export from `client/src/types/index.ts`:

```typescript
export type { Campaign } from './campaign'
```

## Step 4: RPC Map

Add to `client/src/types/rpc.ts`:

```typescript
export const Rpc = {
  // ... existing groups
  Campaign: {
    ListMy: 'list_my_campaigns' satisfies DbFunction,
    Create: 'create_campaign' satisfies DbFunction,
    Update: 'update_campaign' satisfies DbFunction,
    Delete: 'delete_campaign' satisfies DbFunction,
  },
} as const
```

TypeScript will error if the function name doesn't exist in `database.ts`.

## Step 5: Service

Create `client/src/services/CampaignService.ts`:

```typescript
import { BaseRepository } from '@/repositories/BaseRepository'
import type { ServiceData } from '@/types'
import type { PaginatedResponse, PaginationParams } from '@/types/pagination'
import { Rpc } from '@/types/rpc'
import type { Campaign } from '@/types/campaign'

export class CampaignService extends BaseRepository {
  async listCampaigns(params?: PaginationParams): ServiceData<PaginatedResponse<Campaign>> {
    return this.callRpc<PaginatedResponse<Campaign>>(Rpc.Campaign.ListMy, {
      p_limit: params?.limit ?? 20,
      p_cursor: params?.cursor,
    })
  }

  async createCampaign(input: {
    name: string
    description?: string
    goalMinor?: number
    currency?: string
    startsAt?: string
    endsAt?: string
  }): ServiceData<string> {
    return this.callRpc<string>(Rpc.Campaign.Create, {
      p_name: input.name,
      p_description: input.description,
      p_goal_minor: input.goalMinor,
      p_currency: input.currency,
      p_starts_at: input.startsAt,
      p_ends_at: input.endsAt,
    })
  }

  async updateCampaign(
    campaignId: string,
    patch: {
      name?: string
      description?: string
      goalMinor?: number
      currency?: string
      startsAt?: string
      endsAt?: string
    }
  ): ServiceData<void> {
    return this.callRpc<void>(Rpc.Campaign.Update, {
      p_campaign_id: campaignId,
      p_name: patch.name,
      p_description: patch.description,
      p_goal_minor: patch.goalMinor,
      p_currency: patch.currency,
      p_starts_at: patch.startsAt,
      p_ends_at: patch.endsAt,
    })
  }

  async deleteCampaign(campaignId: string): ServiceData<void> {
    return this.callRpc<void>(Rpc.Campaign.Delete, { p_campaign_id: campaignId })
  }
}

export const campaignService = new CampaignService()
```

## Step 6: Hook (if needed)

For paginated lists, use the generic `usePaginatedList`:

```typescript
// In container
import { usePaginatedList } from '@/hooks/usePaginatedList'
import { campaignService } from '@/services/CampaignService'

const {
  items: campaigns,
  loading,
  error,
  loadMore,
  hasMore,
} = usePaginatedList((params) => campaignService.listCampaigns(params))
```

For subscription/feature gating, use `useSubscription`:

```typescript
const { subscription, hasFeature } = useSubscription()
if (hasFeature('campaigns')) { /* render */ }
```

## Step 7: Container

Create `client/src/containers/campaigns/CampaignsContainer.tsx`:

```typescript
'use client'

import { useState, useCallback } from 'react'
import { usePaginatedList } from '@/hooks/usePaginatedList'
import { campaignService } from '@/services/CampaignService'
import { CampaignsView } from '@/components/campaigns/CampaignsView'
import type { Campaign } from '@/types/campaign'

export function CampaignsContainer() {
  const {
    items: campaigns,
    loading,
    error,
    loadMore,
    hasMore,
  } = usePaginatedList((params) => campaignService.listCampaigns(params))

  const [showCreate, setShowCreate] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)

  const handleCreate = useCallback(async (data: { name: string; description?: string }) => {
    const { error } = await campaignService.createCampaign(data)
    if (!error) {
      setShowCreate(false)
      // refresh list
    }
  }, [])

  const handleUpdate = useCallback(async (id: string, data: Partial<Campaign>) => {
    const { error } = await campaignService.updateCampaign(id, data)
    if (!error) {
      setEditingCampaign(null)
    }
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    await campaignService.deleteCampaign(id)
  }, [])

  return (
    <CampaignsView
      campaigns={campaigns}
      loading={loading}
      error={error}
      hasMore={hasMore}
      onLoadMore={loadMore}
      showCreate={showCreate}
      onToggleCreate={() => setShowCreate(!showCreate)}
      onCreate={handleCreate}
      editingCampaign={editingCampaign}
      onEdit={setEditingCampaign}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
    />
  )
}
```

## Step 8: Component

Create `client/src/components/campaigns/CampaignsView.tsx`:

```typescript
'use client'

import { Button } from '@/components/ui/button'
import { CampaignCard } from './CampaignCard'
import { CreateCampaignForm } from './CreateCampaignForm'
import { EditCampaignForm } from './EditCampaignForm'
import type { Campaign } from '@/types/campaign'

interface CampaignsViewProps {
  campaigns: Campaign[]
  loading: boolean
  error: string | null
  hasMore: boolean
  onLoadMore: () => void
  showCreate: boolean
  onToggleCreate: () => void
  onCreate: (data: { name: string; description?: string }) => Promise<void>
  editingCampaign: Campaign | null
  onEdit: (campaign: Campaign | null) => void
  onUpdate: (id: string, data: Partial<Campaign>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function CampaignsView({
  campaigns,
  loading,
  error,
  hasMore,
  onLoadMore,
  showCreate,
  onToggleCreate,
  onCreate,
  editingCampaign,
  onEdit,
  onUpdate,
  onDelete,
}: CampaignsViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <Button onClick={onToggleCreate}>
          {showCreate ? 'Cancel' : 'New Campaign'}
        </Button>
      </div>

      {showCreate && (
        <CreateCampaignForm onSubmit={onCreate} onCancel={onToggleCreate} />
      )}

      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      <div className="grid gap-4">
        {campaigns.map((campaign) => (
          <CampaignCard
            key={campaign.id}
            campaign={campaign}
            onEdit={() => onEdit(campaign)}
            onDelete={() => onDelete(campaign.id)}
          />
        ))}
      </div>

      {loading && <div className="text-center py-4">Loading...</div>}

      {!loading && hasMore && (
        <Button variant="outline" onClick={onLoadMore} className="w-full">
          Load more
        </Button>
      )}

      {editingCampaign && (
        <EditCampaignForm
          campaign={editingCampaign}
          onSubmit={(data) => onUpdate(editingCampaign.id, data)}
          onCancel={() => onEdit(null)}
        />
      )}
    </div>
  )
}
```

## Step 9: Page

Create `client/src/app/campaigns/page.tsx`:

```typescript
import { CampaignsContainer } from '@/containers/campaigns/CampaignsContainer'

export default function CampaignsPage() {
  return <CampaignsContainer />
}
```

Page is thin — no data hooks, no service calls, no business logic.

## Step 10: Tests

### Unit Test

Create `tests/unit/api-contract.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { campaignService } from '@/services/CampaignService'

describe('CampaignService', () => {
  it('listCampaigns returns paginated results', async () => {
    const result = await campaignService.listCampaigns({ limit: 10 })
    expect(result).toHaveProperty('data')
    expect(result.data).toHaveProperty('items')
    expect(Array.isArray(result.data.items)).toBe(true)
  })

  it('createCampaign returns a UUID', async () => {
    const result = await campaignService.createCampaign({
      name: 'Test Campaign',
    })
    expect(result).toHaveProperty('data')
    expect(typeof result.data).toBe('string')
  })
})
```

### E2E Test

Create `tests/e2e/campaigns.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Campaigns', () => {
  test('user can create and view campaigns', async ({ page }) => {
    await page.goto('/campaigns')
    await expect(page.getByText('Campaigns')).toBeVisible()

    await page.getByRole('button', { name: 'New Campaign' }).click()
    await page.getByLabel('Name').fill('My Test Campaign')
    await page.getByRole('button', { name: 'Create' }).click()

    await expect(page.getByText('My Test Campaign')).toBeVisible()
  })
})
```

Run tests:

```bash
# Unit tests
pnpm run test:unit

# E2E tests
pnpm run test:e2e
```

## File Checklist

```
✅ supabase/migrations/<timestamp>_add_campaigns.sql
✅ client/src/types/campaign.ts
✅ client/src/types/rpc.ts (add Campaign group)
✅ client/src/services/CampaignService.ts
✅ client/src/containers/campaigns/CampaignsContainer.tsx
✅ client/src/components/campaigns/CampaignsView.tsx
✅ client/src/components/campaigns/CampaignCard.tsx
✅ client/src/components/campaigns/CreateCampaignForm.tsx
✅ client/src/components/campaigns/EditCampaignForm.tsx
✅ client/src/app/campaigns/page.tsx
✅ tests/unit/api-contract.test.ts
✅ tests/e2e/campaigns.spec.ts
```

## Key Rules

1. **Page is thin** — only renders Container
2. **Container owns backend** — calls services, owns state
3. **Component is pure** — no `@/services` imports, no data hooks
4. **Service uses Rpc** — `Rpc.Group.Action` pattern for type safety
5. **SQL functions first** — always define DB functions before frontend code
6. **Ownership via `auth.uid()`** — all user-resource RPCs check ownership
7. **Paginated lists** — return `{ items: [...], next_cursor: string | null }`
8. **Default batch size** — 20 items per page
