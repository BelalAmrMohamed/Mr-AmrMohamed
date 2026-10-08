# Admin Dashboard — Setup

A private dashboard for Mr. Amr at `/admin` showing live visitor count,
traffic over time, top pages/referrers/countries/devices, AI assistant
usage, and contact-link clicks. Nobody can reach it without the password —
it isn't linked from the public site anywhere.

## 1. Push the database migration

```bash
supabase db push
```

This creates (in `supabase/migrations/20261009000000_admin_analytics.sql`):
- `admin_users`, `admin_sessions` — the login
- `page_views`, `visitor_heartbeats` — traffic + live count
- `ai_chat_events` — AI usage counters (no message content is ever stored)
- `contact_clicks` — which contact buttons get used
- RLS is on for every table with **no public policies** — only the
  service-role key (used server-side only) can read or write any of it.

## 2. Set environment variables

Add these in Vercel (Project → Settings → Environment Variables) and in
your local `.env.local`. See the comments in `.env.example` for details on
each:

```
SUPABASE_SERVICE_ROLE_KEY=...   # Supabase → Project Settings → API → service_role (secret!)
ADMIN_SETUP_SECRET=...          # any long random string, used once
CRON_SECRET=...                 # any long random string, for the cleanup cron
```

`SUPABASE_SERVICE_ROLE_KEY` is **not** the same as the publishable key
already in your `.env.example` — grab it from Supabase's API settings page.
It must never start with `NEXT_PUBLIC_` and must never be sent to the
browser.

## 3. Create the teacher's login (one time)

Once the env vars above are live on Vercel, call the setup endpoint once:

```bash
curl -X POST https://mr-amr-mohamed.vercel.app/api/admin/setup \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "<the ADMIN_SETUP_SECRET value>",
    "email": "amrmohammed4111@gmail.com",
    "password": "<choose a strong password>",
    "displayName": "Mr. Amr"
  }'
```

You can re-run this any time (e.g. to change the password) — it updates
the existing account instead of making a duplicate.

## 4. Sign in

Visit `/admin` (`/admin/index.html`) and sign in with the email/password
from step 3. You're redirected to `/admin/dashboard.html`, which refreshes
itself every 15 seconds.

## How it works, briefly

- `public/js/analytics.js` runs on every page: it sends a `pageview` beacon
  on load and a `heartbeat` every 20s while the tab is visible/open. No
  cookies, no PII — just a random ID kept in `localStorage` so repeat
  visits can be counted as the same visitor.
- "Live now" on the dashboard = heartbeats received in the last 60 seconds.
- The AI chat widget (`public/ai/app.js`) reports anonymous usage events
  (chat started, message sent, tool used, quiz completed/score) — never
  the actual conversation text.
- `api/admin/stats.js` is the one endpoint the dashboard polls; it requires
  a valid session cookie.
- `api/admin/cleanup.js` is wired to a Vercel Cron (`vercel.json`, every 6h)
  to clear expired sessions and stale heartbeats so tables stay small.

## Changing the password later

Just re-run the `curl` command in step 3 with a new password — no need to
touch the database directly.
