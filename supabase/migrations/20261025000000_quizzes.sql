-- ============================================================================
-- Interactive quizzes
-- ============================================================================
-- Driven entirely by the service role key from the serverless API
-- (server/admin/quizzes.js, server/admin/quiz-results.js, server/quiz/*.js).
-- RLS is enabled with NO policies, so the browser's publishable key can never
-- read or write anything here; correct answers can only leave the database
-- through code that strips them first.
-- ============================================================================

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                       -- short share code: /quiz/take?c=<code>
  title text not null,
  description text,
  is_published boolean not null default false,     -- reachable by link
  is_listed boolean not null default false,        -- also shown on the public /quiz page
  auto_grade boolean not null default true,        -- grade on submit (false = teacher grades later)
  reveal text not null default 'score'
    check (reveal in ('none', 'score', 'full')),   -- what the student sees after submitting
  identity_mode text not null default 'google_or_name'
    check (identity_mode in ('google_or_name', 'google_only', 'name_only')),
  time_limit_minutes integer check (time_limit_minutes is null or time_limit_minutes > 0),
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  position integer not null default 0,
  type text not null check (type in ('single', 'multi', 'true_false', 'essay')),
  prompt text not null,
  options jsonb,                                   -- [{id,text}] for single / multi
  correct jsonb,                                   -- see server/_lib/quiz-grade.js for shapes
  partial boolean not null default false,          -- multi only: allow partial credit
  points numeric not null default 1,
  explanation text
);
create index if not exists quiz_questions_quiz_idx on public.quiz_questions(quiz_id, position);

create table if not exists public.quiz_attempts (
  id uuid primary key,                             -- supplied by the browser: makes submit idempotent
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  student_name text not null,
  student_email text,                              -- only when signed in with Google
  auth_user_id uuid,
  started_at timestamptz,
  submitted_at timestamptz not null default now(),
  score numeric,
  max_score numeric,
  status text not null default 'graded' check (status in ('graded', 'pending'))
);
create index if not exists quiz_attempts_quiz_idx on public.quiz_attempts(quiz_id, submitted_at desc);

create table if not exists public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  answer jsonb,
  is_correct boolean,
  points_awarded numeric,                          -- null = not graded yet
  feedback text,
  teacher_override boolean not null default false,
  unique (attempt_id, question_id)
);

alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_answers enable row level security;

grant select, insert, update, delete on public.quizzes        to service_role;
grant select, insert, update, delete on public.quiz_questions to service_role;
grant select, insert, update, delete on public.quiz_attempts  to service_role;
grant select, insert, update, delete on public.quiz_answers   to service_role;
