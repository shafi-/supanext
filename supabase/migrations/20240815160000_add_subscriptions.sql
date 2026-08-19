-- ====================================================================
-- Subscription Management
-- ====================================================================
-- System admins create packages. Org owners subscribe/upgrade/downgrade.
-- System admins can pause/unpause. One active subscription per org.
-- Org users see features based on active subscription.
-- ====================================================================

-- ====================================================================
-- TABLES
-- ====================================================================

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

CREATE TABLE organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active',
  billing_period TEXT NOT NULL DEFAULT 'monthly',
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  action TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'paid',
  invoice_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- INDEXES
-- ====================================================================

CREATE INDEX idx_subscription_plans_is_active ON subscription_plans(is_active);
CREATE INDEX idx_organization_subscriptions_org_id ON organization_subscriptions(organization_id);
CREATE INDEX idx_organization_subscriptions_plan_id ON organization_subscriptions(plan_id);
CREATE INDEX idx_organization_subscriptions_status ON organization_subscriptions(status);
CREATE INDEX idx_subscription_history_org_id ON subscription_history(organization_id);
CREATE INDEX idx_subscription_history_plan_id ON subscription_history(plan_id);
CREATE INDEX idx_subscription_history_created_at ON subscription_history(created_at);

-- ====================================================================
-- RLS POLICIES
-- ====================================================================

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- Deny all by default
CREATE POLICY "deny_all_subscription_plans" ON subscription_plans FOR ALL USING (false);
CREATE POLICY "deny_all_organization_subscriptions" ON organization_subscriptions FOR ALL USING (false);
CREATE POLICY "deny_all_subscription_history" ON subscription_history FOR ALL USING (false);

-- System admins can do everything
CREATE POLICY "System admins can manage subscription plans" ON subscription_plans FOR ALL USING (
  is_system_admin()
);

CREATE POLICY "System admins can manage org subscriptions" ON organization_subscriptions FOR ALL USING (
  is_system_admin()
);

CREATE POLICY "System admins can view subscription history" ON subscription_history FOR SELECT USING (
  is_system_admin()
);

-- Org owners can view their own subscription (owner-only via is_owner short-circuit)
CREATE POLICY "Owners can view own subscription" ON organization_subscriptions FOR SELECT USING (
  can_perform('subscription:read', organization_id)
);

-- Org owners can insert their own subscription (subscribe/upgrade)
CREATE POLICY "Owners can create own subscription" ON organization_subscriptions FOR INSERT WITH CHECK (
  can_perform('subscription:manage', organization_id)
);

-- Org owners can update their own subscription (cancel)
CREATE POLICY "Owners can update own subscription" ON organization_subscriptions FOR UPDATE USING (
  can_perform('subscription:manage', organization_id)
);

-- Org members can view subscription history for their org
CREATE POLICY "Members can view own org subscription history" ON subscription_history FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = subscription_history.organization_id
      AND user_id = auth.uid()
      AND status = 'active'
  )
);

-- Org owners can insert subscription history (for their org)
CREATE POLICY "Owners can create own org subscription history" ON subscription_history FOR INSERT WITH CHECK (
  can_perform('subscription:manage', organization_id)
);

-- ====================================================================
-- HELPER FUNCTIONS
-- ====================================================================

-- Check if org has a specific feature via active subscription
CREATE OR REPLACE FUNCTION has_feature(p_org_id UUID, p_feature TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_subscriptions os
    JOIN subscription_plans sp ON os.plan_id = sp.id
    WHERE os.organization_id = p_org_id
      AND os.status = 'active'
      AND sp.is_active = true
      AND os.current_period_end > NOW()
      AND sp.features ? p_feature
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- ====================================================================
-- SYSTEM ADMIN FUNCTIONS
-- ====================================================================

-- Create subscription plan
CREATE OR REPLACE FUNCTION create_subscription_plan(
  p_name TEXT,
  p_description TEXT,
  p_price_monthly NUMERIC,
  p_price_yearly NUMERIC,
  p_features JSONB
)
RETURNS subscription_plans AS $$
DECLARE
  new_plan subscription_plans;
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Only system admins can create subscription plans';
  END IF;

  INSERT INTO subscription_plans (name, description, price_monthly, price_yearly, features)
  VALUES (p_name, p_description, p_price_monthly, p_price_yearly, p_features)
  RETURNING * INTO new_plan;

  RETURN new_plan;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update subscription plan
CREATE OR REPLACE FUNCTION update_subscription_plan(
  p_plan_id UUID,
  p_name TEXT,
  p_description TEXT,
  p_price_monthly NUMERIC,
  p_price_yearly NUMERIC,
  p_features JSONB,
  p_is_active BOOLEAN
)
RETURNS subscription_plans AS $$
DECLARE
  updated_plan subscription_plans;
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Only system admins can update subscription plans';
  END IF;

  UPDATE subscription_plans
  SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    price_monthly = COALESCE(p_price_monthly, price_monthly),
    price_yearly = COALESCE(p_price_yearly, price_yearly),
    features = COALESCE(p_features, features),
    is_active = COALESCE(p_is_active, is_active),
    updated_at = NOW()
  WHERE id = p_plan_id
  RETURNING * INTO updated_plan;

  IF updated_plan IS NULL THEN
    RAISE EXCEPTION 'Plan not found';
  END IF;

  RETURN updated_plan;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Get all subscription plans
CREATE OR REPLACE FUNCTION get_subscription_plans()
RETURNS SETOF subscription_plans AS $$
  SELECT * FROM subscription_plans ORDER BY price_monthly ASC, price_yearly ASC;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Get all organization subscriptions with plan details
CREATE OR REPLACE FUNCTION get_organization_subscriptions()
RETURNS TABLE(
  id UUID,
  organization_id UUID,
  org_name TEXT,
  plan_name TEXT,
  status TEXT,
  billing_period TEXT,
  price_monthly NUMERIC,
  price_yearly NUMERIC,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
  SELECT
    os.id,
    os.organization_id,
    o.name AS org_name,
    sp.name AS plan_name,
    os.status,
    os.billing_period,
    sp.price_monthly,
    sp.price_yearly,
    os.current_period_start,
    os.current_period_end,
    os.created_at
  FROM organization_subscriptions os
  JOIN organizations o ON os.organization_id = o.id
  JOIN subscription_plans sp ON os.plan_id = sp.id
  ORDER BY os.created_at DESC;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Get subscription history for an org
CREATE OR REPLACE FUNCTION get_subscription_history(p_org_id UUID)
RETURNS TABLE(
  id UUID,
  organization_id UUID,
  org_name TEXT,
  plan_name TEXT,
  action TEXT,
  amount NUMERIC,
  payment_status TEXT,
  invoice_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ
) AS $$
  SELECT
    sh.id,
    sh.organization_id,
    o.name AS org_name,
    sp.name AS plan_name,
    sh.action,
    sh.amount,
    sh.payment_status,
    sh.invoice_number,
    sh.notes,
    sh.created_at
  FROM subscription_history sh
  JOIN organizations o ON sh.organization_id = o.id
  JOIN subscription_plans sp ON sh.plan_id = sp.id
  WHERE sh.organization_id = p_org_id
  ORDER BY sh.created_at DESC;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Pause an org's subscription
CREATE OR REPLACE FUNCTION pause_subscription(p_org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_sub organization_subscriptions%ROWTYPE;
  v_plan subscription_plans%ROWTYPE;
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Only system admins can pause subscriptions';
  END IF;

  SELECT * INTO v_sub
  FROM organization_subscriptions
  WHERE organization_id = p_org_id AND status = 'active'
  LIMIT 1;

  IF v_sub IS NULL THEN
    RAISE EXCEPTION 'No active subscription found for this organization';
  END IF;

  UPDATE organization_subscriptions
  SET status = 'paused', updated_at = NOW()
  WHERE id = v_sub.id;

  SELECT * INTO v_plan FROM subscription_plans WHERE id = v_sub.plan_id;

  INSERT INTO subscription_history (organization_id, plan_id, action, notes)
  VALUES (p_org_id, v_sub.plan_id, 'paused', 'Subscription paused by system admin');

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Unpause an org's subscription
CREATE OR REPLACE FUNCTION unpause_subscription(p_org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_sub organization_subscriptions%ROWTYPE;
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Only system admins can unpause subscriptions';
  END IF;

  SELECT * INTO v_sub
  FROM organization_subscriptions
  WHERE organization_id = p_org_id AND status = 'paused'
  LIMIT 1;

  IF v_sub IS NULL THEN
    RAISE EXCEPTION 'No paused subscription found for this organization';
  END IF;

  UPDATE organization_subscriptions
  SET status = 'active', updated_at = NOW()
  WHERE id = v_sub.id;

  INSERT INTO subscription_history (organization_id, plan_id, action, notes)
  VALUES (p_org_id, v_sub.plan_id, 'renewed', 'Subscription unpaused by system admin');

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ====================================================================
-- ORG OWNER FUNCTIONS
-- ====================================================================

-- Subscribe to plan (expires existing active subscription)
CREATE OR REPLACE FUNCTION subscribe_to_plan(
  p_org_id UUID,
  p_plan_id UUID,
  p_billing_period TEXT
)
RETURNS organization_subscriptions AS $$
DECLARE
  v_new_sub organization_subscriptions;
  v_plan subscription_plans;
  v_period_end TIMESTAMPTZ;
BEGIN
  -- Verify owner (owner-only via is_owner short-circuit in can_perform)
  IF NOT can_perform('subscription:manage', p_org_id) THEN
    RAISE EXCEPTION 'Only organization owners can subscribe to plans';
  END IF;

  -- Verify plan exists and is active
  SELECT * INTO v_plan
  FROM subscription_plans
  WHERE id = p_plan_id AND is_active = true;

  IF v_plan IS NULL THEN
    RAISE EXCEPTION 'Plan not found or inactive';
  END IF;

  -- Expire existing active subscription
  UPDATE organization_subscriptions
  SET status = 'expired', updated_at = NOW()
  WHERE organization_id = p_org_id AND status = 'active';

  -- Calculate period end
  IF p_billing_period = 'yearly' THEN
    v_period_end := NOW() + INTERVAL '1 year';
  ELSE
    v_period_end := NOW() + INTERVAL '1 month';
  END IF;

  -- Create new subscription
  INSERT INTO organization_subscriptions (
    organization_id, plan_id, status, billing_period,
    current_period_start, current_period_end
  )
  VALUES (p_org_id, p_plan_id, 'active', p_billing_period, NOW(), v_period_end)
  RETURNING * INTO v_new_sub;

  -- Record history
  INSERT INTO subscription_history (organization_id, plan_id, action, amount, payment_status, notes)
  VALUES (
    p_org_id, p_plan_id, 'subscribed',
    CASE WHEN p_billing_period = 'yearly' THEN v_plan.price_yearly ELSE v_plan.price_monthly END,
    'paid',
    'Initial subscription to ' || v_plan.name
  );

  RETURN v_new_sub;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Change plan (upgrade/downgrade, expires old)
CREATE OR REPLACE FUNCTION change_plan(
  p_org_id UUID,
  p_new_plan_id UUID,
  p_billing_period TEXT
)
RETURNS organization_subscriptions AS $$
DECLARE
  v_old_sub organization_subscriptions%ROWTYPE;
  v_new_plan subscription_plans;
  v_new_sub organization_subscriptions;
  v_period_end TIMESTAMPTZ;
  v_action TEXT;
BEGIN
  -- Verify owner (owner-only via is_owner short-circuit in can_perform)
  IF NOT can_perform('subscription:manage', p_org_id) THEN
    RAISE EXCEPTION 'Only organization owners can change plans';
  END IF;

  -- Get current active subscription
  SELECT * INTO v_old_sub
  FROM organization_subscriptions
  WHERE organization_id = p_org_id AND status = 'active'
  LIMIT 1;

  IF v_old_sub IS NULL THEN
    RAISE EXCEPTION 'No active subscription found. Use subscribe_to_plan instead.';
  END IF;

  -- Verify new plan exists and is active
  SELECT * INTO v_new_plan
  FROM subscription_plans
  WHERE id = p_new_plan_id AND is_active = true;

  IF v_new_plan IS NULL THEN
    RAISE EXCEPTION 'Plan not found or inactive';
  END IF;

  -- Determine action
  IF v_new_plan.price_monthly > (
    SELECT price_monthly FROM subscription_plans WHERE id = v_old_sub.plan_id
  ) THEN
    v_action := 'upgraded';
  ELSIF v_new_plan.price_monthly < (
    SELECT price_monthly FROM subscription_plans WHERE id = v_old_sub.plan_id
  ) THEN
    v_action := 'downgraded';
  ELSE
    v_action := 'changed';
  END IF;

  -- Expire old subscription
  UPDATE organization_subscriptions
  SET status = 'expired', updated_at = NOW()
  WHERE id = v_old_sub.id;

  -- Calculate period end
  IF p_billing_period = 'yearly' THEN
    v_period_end := NOW() + INTERVAL '1 year';
  ELSE
    v_period_end := NOW() + INTERVAL '1 month';
  END IF;

  -- Create new subscription
  INSERT INTO organization_subscriptions (
    organization_id, plan_id, status, billing_period,
    current_period_start, current_period_end
  )
  VALUES (p_org_id, p_new_plan_id, 'active', p_billing_period, NOW(), v_period_end)
  RETURNING * INTO v_new_sub;

  -- Record history
  INSERT INTO subscription_history (organization_id, plan_id, action, amount, payment_status, notes)
  VALUES (
    p_org_id, p_new_plan_id, v_action,
    CASE WHEN p_billing_period = 'yearly' THEN v_new_plan.price_yearly ELSE v_new_plan.price_monthly END,
    'paid',
    v_action || ' to ' || v_new_plan.name
  );

  RETURN v_new_sub;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Cancel subscription
CREATE OR REPLACE FUNCTION cancel_subscription(p_org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_sub organization_subscriptions%ROWTYPE;
BEGIN
  -- Verify owner (owner-only via is_owner short-circuit in can_perform)
  IF NOT can_perform('subscription:manage', p_org_id) THEN
    RAISE EXCEPTION 'Only organization owners can cancel subscriptions';
  END IF;

  SELECT * INTO v_sub
  FROM organization_subscriptions
  WHERE organization_id = p_org_id AND status = 'active'
  LIMIT 1;

  IF v_sub IS NULL THEN
    RAISE EXCEPTION 'No active subscription found';
  END IF;

  UPDATE organization_subscriptions
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = v_sub.id;

  INSERT INTO subscription_history (organization_id, plan_id, action, notes)
  VALUES (p_org_id, v_sub.plan_id, 'cancelled', 'Subscription cancelled by owner');

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Get my current subscription
CREATE OR REPLACE FUNCTION get_my_subscription(p_org_id UUID)
RETURNS TABLE(
  id UUID,
  plan_id UUID,
  plan_name TEXT,
  description TEXT,
  price_monthly NUMERIC,
  price_yearly NUMERIC,
  features JSONB,
  status TEXT,
  billing_period TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ
) AS $$
  SELECT
    os.id,
    sp.id AS plan_id,
    sp.name AS plan_name,
    sp.description,
    sp.price_monthly,
    sp.price_yearly,
    sp.features,
    os.status,
    os.billing_period,
    os.current_period_start,
    os.current_period_end
  FROM organization_subscriptions os
  JOIN subscription_plans sp ON os.plan_id = sp.id
  WHERE os.organization_id = p_org_id
    AND os.status = 'active'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- ====================================================================
-- TRIGGERS
-- ====================================================================

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_subscriptions_updated_at BEFORE UPDATE ON organization_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- GRANTS
-- ====================================================================

-- System admin functions
GRANT EXECUTE ON FUNCTION create_subscription_plan(TEXT, TEXT, NUMERIC, NUMERIC, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_subscription_plan(UUID, TEXT, TEXT, NUMERIC, NUMERIC, JSONB, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_subscription_plans() TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_subscriptions() TO authenticated;
GRANT EXECUTE ON FUNCTION get_subscription_history(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION pause_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unpause_subscription(UUID) TO authenticated;

-- Org owner functions
GRANT EXECUTE ON FUNCTION subscribe_to_plan(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION change_plan(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_subscription(UUID) TO authenticated;

-- Feature check
GRANT EXECUTE ON FUNCTION has_feature(UUID, TEXT) TO authenticated;

-- ====================================================================
-- SEED DATA
-- ====================================================================

-- Default subscription plans
INSERT INTO subscription_plans (name, description, price_monthly, price_yearly, features) VALUES
  ('Free', 'Basic features for small teams', 0, 0, '["todos", "members"]'),
  ('Pro', 'Advanced features for growing teams', 29, 290, '["todos", "members", "invites", "settings"]'),
  ('Enterprise', 'Full features for large organizations', 99, 990, '["todos", "members", "invites", "settings", "analytics", "audit"]')
ON CONFLICT DO NOTHING;

-- ====================================================================
-- MIGRATION COMPLETE
-- ====================================================================
