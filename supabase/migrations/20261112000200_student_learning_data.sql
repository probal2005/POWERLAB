-- POWERLAB: Persistent student learning data.
-- Run this migration in the Supabase SQL Editor.

begin;

-- 1. Per-student law progress.
create table if not exists public.student_law_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  law_slug text not null check (
    length(trim(law_slug)) between 1 and 150
  ),
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed')),
  started_at timestamptz not null default now(),
  last_viewed_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_law_progress_user_law_unique
    unique (user_id, law_slug),
  constraint student_law_progress_completion_consistent
    check (
      (status = 'completed' and completed_at is not null)
      or
      (status = 'in_progress' and completed_at is null)
    )
);

create index if not exists student_law_progress_user_status_idx
  on public.student_law_progress(user_id, status);

create index if not exists student_law_progress_last_viewed_idx
  on public.student_law_progress(user_id, last_viewed_at desc);


-- 2. Per-student bookmarks.
create table if not exists public.student_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  law_slug text not null check (
    length(trim(law_slug)) between 1 and 150
  ),
  created_at timestamptz not null default now(),
  constraint student_bookmarks_user_law_unique
    unique (user_id, law_slug)
);

create index if not exists student_bookmarks_user_created_idx
  on public.student_bookmarks(user_id, created_at desc);


-- 3. Immutable assessment attempt history.
-- Use law_slug = '__final__' for a future comprehensive assessment.
create table if not exists public.student_assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  law_slug text not null check (
    length(trim(law_slug)) between 1 and 150
  ),
  score integer not null check (score >= 0),
  total_questions integer not null check (total_questions > 0),
  percentage integer not null check (percentage between 0 and 100),
  passed boolean not null,
  answers jsonb not null default '[]'::jsonb
    check (jsonb_typeof(answers) = 'array'),
  created_at timestamptz not null default now(),
  constraint student_assessment_attempts_score_consistent
    check (score <= total_questions)
);

create index if not exists student_assessment_attempts_user_created_idx
  on public.student_assessment_attempts(user_id, created_at desc);

create index if not exists student_assessment_attempts_user_law_idx
  on public.student_assessment_attempts(user_id, law_slug);


-- 4. Enable Row Level Security.
alter table public.student_law_progress enable row level security;
alter table public.student_bookmarks enable row level security;
alter table public.student_assessment_attempts enable row level security;


-- 5. Remove any previous policies with these names before recreating.
drop policy if exists "Students can read their own law progress"
  on public.student_law_progress;

drop policy if exists "Students can create their own law progress"
  on public.student_law_progress;

drop policy if exists "Students can update their own law progress"
  on public.student_law_progress;

drop policy if exists "Students can read their own bookmarks"
  on public.student_bookmarks;

drop policy if exists "Students can create their own bookmarks"
  on public.student_bookmarks;

drop policy if exists "Students can delete their own bookmarks"
  on public.student_bookmarks;

drop policy if exists "Students can read their own assessment attempts"
  on public.student_assessment_attempts;

drop policy if exists "Students can create their own assessment attempts"
  on public.student_assessment_attempts;


-- 6. Progress policies.
create policy "Students can read their own law progress"
on public.student_law_progress
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Students can create their own law progress"
on public.student_law_progress
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "Students can update their own law progress"
on public.student_law_progress
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));


-- 7. Bookmark policies.
create policy "Students can read their own bookmarks"
on public.student_bookmarks
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Students can create their own bookmarks"
on public.student_bookmarks
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "Students can delete their own bookmarks"
on public.student_bookmarks
for delete
to authenticated
using (user_id = (select auth.uid()));


-- 8. Assessment history policies.
create policy "Students can read their own assessment attempts"
on public.student_assessment_attempts
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Students can create their own assessment attempts"
on public.student_assessment_attempts
for insert
to authenticated
with check (user_id = (select auth.uid()));


-- 9. Explicit table permissions.
revoke all on public.student_law_progress
  from anon, authenticated;

revoke all on public.student_bookmarks
  from anon, authenticated;

revoke all on public.student_assessment_attempts
  from anon, authenticated;

grant select, insert, update
  on public.student_law_progress to authenticated;

grant select, insert, delete
  on public.student_bookmarks to authenticated;

grant select, insert
  on public.student_assessment_attempts to authenticated;

commit;
