# Admin Dashboard — Setup

A private dashboard for Mr. Amr at `/admin` showing live visitor count,
traffic over time, top pages/referrers/countries/devices, AI assistant
usage, and contact-link clicks. Nobody can reach it without signing in with
an authorized Google account — it isn't linked from the public site
anywhere.

Sign-in is "Continue with Google" via Supabase Auth. **There is no password
of ours anywhere in this system** — when Mr. Amr changes his Google
password, nothing here needs to change. Access is controlled purely by an
email allowlist in the database.

## 1. Push the database migration

```bash
supabase db push
```

This creates (in `supabase/migrations/20261009000000_admin_analytics.sql`):
- `admin_emails` — the allowlist of who can open the dashboard. Pre-seeded
  with `belalamrofficial@gmail.com` and `amrmohammed4111@gmail.com`.
- `page_views`, `visitor_heartbeats` — traffic + live count
- `ai_chat_events` — AI usage counters (no message content is ever stored)
- `contact_clicks` — which contact buttons get used
- RLS is on for every table with **no public policies** — only the
  service-role key (used server-side only) can read or write any of it.

## 2. Set environment variables

You already have the three that matter here:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
```

The first two are also used by the admin pages directly (via
`/api/public-config`, since this project has no build step to inject env
vars into static HTML). `SUPABASE_SERVICE_ROLE_KEY` is used server-side
only, to verify sessions and check the allowlist — never shipped to the
browser.

Also set, for the scheduled cleanup job (optional but recommended):

```
CRON_SECRET=generate_a_long_random_string
```

You do **not** need `ADMIN_SETUP_SECRET` anymore — that was for the old
password system, which is gone.

## 3. Enable Google as a sign-in provider in Supabase

You've already created the OAuth client in Google Cloud Console and
connected it to Supabase — confirm these two things:

1. **Supabase → Authentication → Sign In / Providers → Google** is
   **Enabled**, with your Google Client ID and Secret filled in.
2. **Supabase → Authentication → URL Configuration → Redirect URLs**
   includes your site's admin URL, e.g.:
   `https://mr-amr-mohamed.vercel.app/admin/index.html`
   (add `http://localhost:8080/admin/index.html` too if you test locally.)

That's it — no code or env vars needed for this part.

## 4. Who can sign in

Controlled entirely by the `admin_emails` table — already seeded with:

| email | label |
|---|---|
| `belalamrofficial@gmail.com` | Belal (testing) |
| `amrmohammed4111@gmail.com` | Mr. Amr |

To add or remove someone later, open Supabase → Table Editor →
`admin_emails` and insert/delete a row. No redeploy, no env var changes,
nothing on Vercel. (Or via SQL: `insert into admin_emails (email, label)
values ('someone@gmail.com', 'Label');`)

Anyone who signs in with Google but isn't on this list gets a clear
"not authorized" message and is signed back out automatically.

## 5. Sign in

Visit `/admin` and click **Continue with Google**. If your email is on the
allowlist, you land on `/admin/dashboard.html`, which refreshes itself
every 15 seconds.

## How it works, briefly

- The sign-in page and dashboard load the Supabase JS client from a CDN and
  talk to Supabase Auth directly for the Google OAuth flow — no password,
  no session cookie of our own.
- Every `/api/admin/*` call sends the Supabase access token as
  `Authorization: Bearer <token>`. The server asks Supabase who that token
  belongs to, then checks the email against `admin_emails`.
- `public/js/analytics.js` runs on every public page: it sends a
  `pageview` beacon on load and a `heartbeat` every 20s while the tab is
  visible/open. No cookies, no PII — just a random ID kept in
  `localStorage` so repeat visits can be counted as the same visitor.
- "Live now" on the dashboard = heartbeats received in the last 60 seconds.
- The AI chat widget (`public/ai/app.js`) reports anonymous usage events
  (chat started, message sent, tool used, quiz completed/score) — never
  the actual conversation text.
- `api/admin/cleanup.js` is wired to a Vercel Cron (`vercel.json`, every 6h)
  to clear stale heartbeats so the table stays small.
