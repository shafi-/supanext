-- ====================================================================
-- supabase/seed.sql
-- Idempotent baseline data for fresh deployments.
-- Run via `supabase db reset` (auto-applied) or `psql -f seed.sql`.
-- ====================================================================

begin;

-- -----------------------------------------------------------------------------
-- Features: high-level capabilities gated behind plans.
-- -----------------------------------------------------------------------------
insert into app.features (code, name, description) values
  ('fundraising', 'Fundraising', 'Run fundraising campaigns and accept donations.'),
  ('platform_administration', 'Platform Administration', 'Manage other users and platform settings.'),
  ('organization_administration', 'Organization Administration', 'Manage an organization, its members, and its subscriptions.')
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- Permissions: granular grants checked by security.can_perform().
-- scope = 'organization' (per-org) or 'system' (global, requires system admin).
-- -----------------------------------------------------------------------------
insert into app.permissions (code, name, description, scope, feature_id) values
  -- Organization scope
  ('fundraising.view',     'View campaigns',          'See campaigns for the current organization.',                                'organization', (select id from app.features where code = 'fundraising')),
  ('fundraising.create',   'Create campaigns',        'Create new fundraising campaigns.',                                          'organization', (select id from app.features where code = 'fundraising')),
  ('fundraising.update',   'Update campaigns',        'Edit existing fundraising campaigns.',                                        'organization', (select id from app.features where code = 'fundraising')),
  ('fundraising.delete',   'Delete campaigns',        'Permanently remove fundraising campaigns.',                                   'organization', (select id from app.features where code = 'fundraising')),
  ('fundraising.manage',  'Manage fundraising',      'Full fundraising permission set (view/create/update/delete).',               'organization', (select id from app.features where code = 'fundraising')),
  ('organization.members.invite',           'Invite members',           'Send invitations to new members.',                'organization', (select id from app.features where code = 'organization_administration')),
  ('organization.members.remove',           'Remove members',           'Remove members from the organization.',           'organization', (select id from app.features where code = 'organization_administration')),
  ('organization.members.change_role',      'Change member roles',      'Change a member''s role.',                         'organization', (select id from app.features where code = 'organization_administration')),
  ('organization.members.permissions.manage', 'Manage member permissions', 'Grant or revoke per-member permissions.',        'organization', (select id from app.features where code = 'organization_administration')),
  -- Platform scope (require system admin)
  ('system.organizations.approve',  'Approve organizations',  'Approve pending organization requests.',  'system', (select id from app.features where code = 'platform_administration')),
  ('system.organizations.reject',   'Reject organizations',   'Reject pending organization requests.',   'system', (select id from app.features where code = 'platform_administration')),
  ('system.organizations.suspend',  'Suspend organizations',  'Suspend active organizations.',           'system', (select id from app.features where code = 'platform_administration')),
  ('system.organizations.unsuspend','Unsuspend organizations','Reactivate suspended organizations.',     'system', (select id from app.features where code = 'platform_administration')),
  ('system.plans.manage',           'Manage plans',           'Create, update, or deactivate plans.',    'system', (select id from app.features where code = 'platform_administration'))
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- Subscription plans.
-- -----------------------------------------------------------------------------
insert into app.subscription_plans (code, name, description, price_minor, currency, billing_interval, is_active) values
  ('free', 'Free',     'Read-only access to the organization.',     0,      'USD', 'month', true),
  ('pro',  'Pro',      'Full fundraising and member management.',    2900,   'USD', 'month', true),
  ('enterprise', 'Enterprise', 'Unlimited campaigns and priority support.', 9900, 'USD', 'month', true)
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- Plan → Feature mapping.
-- -----------------------------------------------------------------------------
insert into app.plan_features (plan_id, feature_id)
select sp.id, f.id
from app.subscription_plans sp
cross join app.features f
where (sp.code, f.code) in (
  ('free', 'fundraising'),       -- free can view/create campaigns
  ('pro',  'fundraising'),
  ('pro',  'organization_administration'),
  ('enterprise', 'fundraising'),
  ('enterprise', 'organization_administration'),
  ('enterprise', 'platform_administration')
)
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- System admin flag.
-- A row in app.system_admins marks a user as a global administrator.
-- Empty by default; promote users via scripts/bootstrap-admin.sh.
-- -----------------------------------------------------------------------------
-- (no rows inserted here on purpose; bootstrap script handles it)

commit;
