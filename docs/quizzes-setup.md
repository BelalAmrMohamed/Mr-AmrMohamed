# Quizzes — Setup & How It Works

Mr. Amr builds quizzes at **`/admin/quizzes`**, sends students a link, and reads every
student's answers at **`/admin/quiz-results?id=…`** (also reachable from the quiz list and
from a "Quizzes" button on the dashboard).

| Page | Who | What |
|---|---|---|
| `/admin/quizzes` | teacher | create / edit / delete quizzes, copy the student link |
| `/admin/quiz-results?id=` | teacher | every attempt, per-question stats, manual scoring, auto-grade, CSV export |
| `/quiz` | everyone | list of quizzes marked **listed** (not linked from the homepage) |
| `/quiz/take?c=<code>` | students | take one quiz (the link you share) |

## One-time setup

1. **Database** — `supabase db push` applies `supabase/migrations/20261025000000_quizzes.sql`
   (4 tables: `quizzes`, `quiz_questions`, `quiz_attempts`, `quiz_answers`; RLS on, no public policies).
2. **Supabase → Authentication → URL Configuration** — add `https://mr-amr-mohamed.vercel.app/**`
   to *Redirect URLs* (the Google provider is already on for `/admin`).
3. **Google Cloud → OAuth consent screen → Audience** — set it to **In production** and keep only the
   default scopes (`email`, `profile`, `openid`).
   The "100 users" cap applies to apps that request *sensitive/restricted* scopes; name + email sign-in is
   exempt and needs no Google verification. (While left in *Testing*, only listed test users could sign in.)

No new environment variables or npm packages.

## Question types

| Type | Auto-grading |
|---|---|
| Multiple choice — one answer | exact match |
| Multiple choice — one or more answers (the correct set may be 1 or many) | exact set; optional **partial credit** = `(right − wrong) ÷ total right` |
| True / False | exact match |
| Essay | **key ideas**: one line per idea, alternatives separated by commas (`because, due to`). Score = points × ideas found ÷ total ideas. Whole-word, case/punctuation-insensitive, Arabic works. Optional minimum word count. |

## Per-quiz settings

- **Who can take it** — Google or typed name (default) · Google required · typed name only.
  Typed names are not verified; Google sign-in records the verified email.
- **Grade automatically** — turn **off** for a Google-Forms-style "just collect answers". Attempts are stored as
  *Needs grading*; later press **Auto-grade pending** on the results page, or set each answer's points by hand
  (a hand-set score is never overwritten by auto-grading).
- **After submitting, show the student** — score only (default) · score + correct answers + explanations · nothing.
- **Open for students** (published) and **listed on /quiz**.
- **Time limit** — shown as a countdown; the quiz auto-submits at 0. It is enforced in the browser only.

## Good to know

- Correct answers, explanations and essay keywords never leave the server before a student submits
  (`/api/quiz/get` strips them; grading happens in `/api/quiz/submit`).
- Submitting twice (double click / retry) never creates two attempts — the browser sends a unique attempt id.
  A student *can* start a new attempt later; every attempt is stored and shown.
- Editing a quiz keeps existing questions' ids, so already-submitted answers stay attached. Changing a correct
  answer does **not** re-grade attempts that were already submitted. Deleting a question deletes its stored answers.
- CSV export neutralises spreadsheet formulas in student-typed text and opens correctly in Excel (UTF-8 BOM).

## Code map

- `server/_lib/quiz-grade.js` — pure grading (unit-tested) · `server/_lib/quiz-util.js` — small helpers
- `server/admin/quizzes.js`, `server/admin/quiz-results.js` — teacher API (all behind `requireAdmin`)
- `server/quiz/list.js`, `get.js`, `submit.js` — public API
- `app/api/**/route.js` — 9-line wrappers (same pattern as the existing API)
- `public/quiz/*` (student pages + shared `quiz.css`), `public/admin/quizzes.html`, `quiz-results.html`, `quiz-admin.js`
- Clean URLs: `vercel.json` rewrites (Vercel) and `next.config.js` rewrites (`next dev` / `next start`)

## Tests

```bash
npm run test:quiz     # grader unit tests + API tests against an in-memory fake of Supabase
```
