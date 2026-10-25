## Platform Improvement

## Interactive Quizzes
- The owner wants to be able to upload quizzez.
- The quizzes must be interactive and advanced system:
  - MCQ (Single option selection).
  - MCQ (Multiple option selection, but the correct might be one or more).
  - True or False.
  - Essay with an automatic correction system.
- He asked he wants it to be like Google Forms where he can view each student's answers after he takes the quiz.
  - From that I understood that he might not need for the questions to be corrected always, so that must be an option for him to enable auto question correction or not.
  - He wants to know the students (We will use Google Sign in or Email sign in. But the platform isn't verified in Google, so I don't know what is the exact number, but it's about 100, a 100 allowed emails to sign in before the sign-in with Google stops. But douple check that)
  - We might implement a simpler opiton where students just write their name manually.
  - He wants to view the answers of each student.

## AI Chat
- The stop AI button doesn't work; if I click it, the AI doesn't stop, it keeps generating the response and consuming credits.
- The interactive quiz is now messy: I myself don't even understand the problem with it so far. In the one test I ran after the latest changes, instead of generating a quiz in one card with next and previous buttons to go through the questions, it generated 3 cards, 2 of which where 1-question each, the 3rd was a quiz on its own and a score to it. But then in another test, it generated the quiz correctly, five questions in one card. If the problem is from the model itself not the tooling, try to make the tooling way simpler for the model.

## Application
Make the website an installable app.

Online First rules (for users that install the app):
- When the user is only, they always and always pull the code from the host, not the offline cached code. We aren't going to use a service worker version, because I always forget to increament it when updating.
- When the user is offline, the cached code gets displayed with a very tiny offline banner at the bottom of the screen, that has a cancel button.
- When the user is online they always update the cached code.
- Users that didn't instal the app never cache anything at all.

## SEO & GEO
Improve the SEO and GEO of the website:
- Sign it in Google Search Console and bing search, too.

## Page For the Teacher — ✅ Done, see [docs/admin-dashboard-setup.md](admin-dashboard-setup.md)
- `/admin` — sign-in page (adapted from the template, navy/gold themed),
  with **both** "Continue with Google" and an email/password form, both
  via Supabase Auth — no password of ours anywhere, so nothing to update
  when a Google password changes or an email/password login is reset.
- Access gated by an `admin_emails` allowlist table in the database (add/
  remove admins there any time, no redeploy needed). Seeded with
  `belalamrofficial@gmail.com` and `amrmohammed4111@gmail.com`.
- Schema ships as two migrations: `20261009000000_admin_analytics.sql`
  (original, already pushed — do not edit) and
  `20261009103000_admin_analytics_auth_update.sql` (adds `admin_emails`,
  drops the superseded `admin_users`/`admin_sessions` tables).
- `/admin/dashboard.html` — live visitor count, 30-day traffic chart, top
  pages/referrers/countries/devices/browsers, AI assistant usage stats,
  contact-click counts, and a recent-visitor feed. Auto-refreshes every 15s.
- Own implementation (no Vercel Insights dependency): `public/js/analytics.js`
  beacons page views + heartbeats to `api/track.js`; Supabase stores it.
- Setup steps (migrations, env vars, enabling providers, creating
  email/password accounts): see the linked doc.