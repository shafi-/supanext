-- Seed a system administrator for local development and E2E tests.
-- Supabase applies this automatically on `supabase db reset`.
-- Idempotent: safe to run multiple times.

do $$
declare
  v_user_id uuid := '00000000-0000-0000-0000-0000000000ad';
  v_email text := 'system-admin@supanext.test';
  v_password text := 'AdminPassword123!';
begin
  if not exists (select 1 from auth.users where email = v_email) then
    insert into auth.users (
      id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, role, aud,
      created_at, updated_at, is_anonymous, is_sso_user
    ) values (
      v_user_id, v_email,
      crypt(v_password, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"System Admin"}'::jsonb,
      'authenticated', 'authenticated',
      now(), now(), false, false
    );

    insert into auth.identities (
      id, user_id, identity_data, provider_id, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      v_user_id, v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email),
      'email', 'email',
      now(), now(), now()
    );
  end if;

  insert into app.system_admins (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;
end $$;
