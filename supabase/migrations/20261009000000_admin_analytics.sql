-- ============================================================================
-- Admin dashboard & site analytics
-- ============================================================================
-- Everything here is written to be driven entirely by the service role key
-- from Vercel serverless functions (api/*.js). RLS is enabled on every table
-- with NO public policies, so the anon/publishable key can never read or
-- write anything — only the service role (server-side only) can.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. admin_users — the teacher's login
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  display_name text not null default 'Mr. Amr',
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

alter table public.admin_users enable row level security;
-- No policies -> inaccessible except via service role key (server-side).

-- ---------------------------------------------------------------------------
-- 2. admin_sessions — simple server-side session tokens (cookie-based auth)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_sessions (
  token text primary key,
  admin_id uuid not null references public.admin_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  user_agent text,
  ip text
);

create index if not exists admin_sessions_admin_id_idx on public.admin_sessions(admin_id);
create index if not exists admin_sessions_expires_at_idx on public.admin_sessions(expires_at);

alter table public.admin_sessions enable row level security;

-- ---------------------------------------------------------------------------
-- 3. page_views — one row per page view (SEO-friendly, lightweight)
-- ---------------------------------------------------------------------------
create table if not exists public.page_views (
  id bigint generated always as identity primary key,
  visitor_id text not null,          -- anonymous, random, stored in localStorage (not PII)
  session_id text not null,          -- resets after ~30 min of inactivity
  path text not null,
  referrer text,
  country text,                      -- derived from Vercel geo headers, e.g. "EG"
  city text,
  device_type text,                  -- mobile | tablet | desktop
  browser text,
  os text,
  language text,
  is_installed_pwa boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists page_views_created_at_idx on public.page_views(created_at desc);
create index if not exists page_views_path_idx on public.page_views(path);
create index if not exists page_views_visitor_id_idx on public.page_views(visitor_id);
create index if not exists page_views_session_id_idx on public.page_views(session_id);

alter table public.page_views enable row level security;

-- ---------------------------------------------------------------------------
-- 4. visitor_heartbeats — powers the "live now" count
-- ---------------------------------------------------------------------------
-- Upserted every ~20s by the client while a tab is open/visible.
-- A visitor is "live" if last_seen_at is within the last 60 seconds.
create table if not exists public.visitor_heartbeats (
  visitor_id text primary key,
  session_id text not null,
  path text not null,
  country text,
  device_type text,
  last_seen_at timestamptz not null default now()
);

create index if not exists visitor_heartbeats_last_seen_idx on public.visitor_heartbeats(last_seen_at desc);

alter table public.visitor_heartbeats enable row level security;

-- ---------------------------------------------------------------------------
-- 5. ai_chat_events — lightweight usage stats for the AI assistant
-- ---------------------------------------------------------------------------
-- We deliberately do NOT store chat message content here (privacy) — only
-- counters/metadata so the teacher can see how the assistant is being used.
create table if not exists public.ai_chat_events (
  id bigint generated always as identity primary key,
  visitor_id text not null,
  event_type text not null,          -- 'chat_started' | 'message_sent' | 'tool_used' | 'quiz_completed'
  tool_name text,                    -- populated when event_type = 'tool_used'
  quiz_score numeric,                -- populated when event_type = 'quiz_completed' (0-1)
  quiz_total int,
  created_at timestamptz not null default now()
);

create index if not exists ai_chat_events_created_at_idx on public.ai_chat_events(created_at desc);
create index if not exists ai_chat_events_event_type_idx on public.ai_chat_events(event_type);

alter table public.ai_chat_events enable row level security;

-- ---------------------------------------------------------------------------
-- 6. contact_clicks — which contact method visitors used (from the AI tool
--    and the footer/contact section) — tells the teacher what's working
-- ---------------------------------------------------------------------------
create table if not exists public.contact_clicks (
  id bigint generated always as identity primary key,
  visitor_id text not null,
  method text not null,              -- whatsapp | email | telegram | linkedin
  source text not null default 'site', -- 'site' | 'ai_assistant'
  created_at timestamptz not null default now()
);

create index if not exists contact_clicks_created_at_idx on public.contact_clicks(created_at desc);

alter table public.contact_clicks enable row level security;

-- ---------------------------------------------------------------------------
-- Helper view: daily visit rollups (used by the dashboard chart; computed
-- on the fly via the API, this view just makes ad-hoc SQL easier later)
-- ---------------------------------------------------------------------------
create or replace view public.daily_visit_stats as
select
  date_trunc('day', created_at) as day,
  count(*) as page_views,
  count(distinct visitor_id) as unique_visitors
from public.page_views
group by 1
order by 1 desc;

-- ---------------------------------------------------------------------------
-- Housekeeping: auto-expire old heartbeats & sessions so tables stay small.
-- Call periodically from a cron-style Vercel function, or just let the
-- admin stats API opportunistically delete stale rows (see api/admin/*.js).
-- ---------------------------------------------------------------------------
