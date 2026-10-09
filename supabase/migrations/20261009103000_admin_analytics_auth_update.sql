-- Forward migration for the updated admin analytics schema.
-- The original 20261009000000 migration was already applied, so do not edit it.
-- This migration switches the schema from custom admin credentials/sessions
-- to a Supabase Auth email allowlist.

-- Allowlisted Google-authenticated accounts for /api/admin/*.
create table if not exists public.admin_emails (
  email text primary key,
  label text,
  added_at timestamptz not null default now()
);

alter table public.admin_emails enable row level security;

insert into public.admin_emails (email, label) values
  ('belalamrofficial@gmail.com', 'Belal (testing)'),
  ('amrmohammed4111@gmail.com', 'Mr. Amr')
on conflict (email) do nothing;

-- These tables belonged to the previous custom-password/session approach.
-- Drop sessions first because they reference admin_users.
drop table if exists public.admin_sessions;
drop table if exists public.admin_users;
