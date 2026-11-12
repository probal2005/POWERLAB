-- POWERLAB: Secure certification foundation.
-- Run manually in the Supabase SQL Editor after reviewing this file.
--
-- IMPORTANT:
-- 1. The programme is disabled by default.
-- 2. All 48 modules start as not ready for certification.
-- 3. Final assessment publication is disabled by default.
-- 4. Students cannot directly insert or modify completion or attempt records.
-- 5. Final assessment answers are stored privately and graded server-side.
-- 6. Certificate verification exposes only minimum public information.
--
-- Module completion currently represents an authenticated student
-- completion confirmation. It is not proof of genuine study or engagement.
-- A stronger engagement/assessment mechanism must be implemented before
-- treating completion as independently verified academic achievement.

begin;

-- ============================================================
-- 1. Certification module catalogue
-- ============================================================

create table if not exists public.certification_modules (
  law_slug text primary key
    check (length(trim(law_slug)) between 1 and 150),

  law_number integer not null unique
    check (law_number between 1 and 48),

  is_ready boolean not null default false,

  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint certification_module_review_consistency
    check (
      (is_ready = false)
      or
      (is_ready = true and reviewed_at is not null)
    )
);

insert into public.certification_modules (law_number, law_slug)
values
  (1, 'never-outshine-the-master'),
  (2, 'never-trust-too-much-friends'),
  (3, 'conceal-your-intentions'),
  (4, 'always-say-less-than-necessary'),
  (5, 'so-much-depends-on-reputation-guard-it-with-your-life'),
  (6, 'court-attention-at-all-cost'),
  (7, 'get-others-to-do-the-work-for-you'),
  (8, 'make-other-people-come-to-you'),
  (9, 'win-through-your-actions-never-through-argument'),
  (10, 'infection-avoid-the-unhappy-and-unlucky'),
  (11, 'learn-to-keep-people-dependent-on-you'),
  (12, 'use-selective-honesty-and-generosity'),
  (13, 'when-asking-for-help-appeal-to-self-interest'),
  (14, 'pose-as-a-friend-work-as-a-spy'),
  (15, 'crush-your-enemy-totally'),
  (16, 'use-absence-to-increase-respect-and-honor'),
  (17, 'keep-others-in-suspended-terror'),
  (18, 'do-not-build-fortress-to-protect-yourself'),
  (19, 'know-who-youre-dealing-with'),
  (20, 'do-not-commit-to-anyone'),
  (21, 'play-a-sucker-to-catch-a-sucker'),
  (22, 'use-surrender-tactic-transform-weakness-into-power'),
  (23, 'concentrate-your-forces'),
  (24, 'play-the-perfect-courtier'),
  (25, 're-create-yourself'),
  (26, 'keep-your-hands-clean'),
  (27, 'play-on-peoples-need-to-believe'),
  (28, 'enter-action-with-boldness'),
  (29, 'plan-all-the-way-to-the-end'),
  (30, 'make-your-accomplishments-seem-effortless'),
  (31, 'control-the-options-get-others-to-play-with-the-cards-you-deal'),
  (32, 'play-to-peoples-fantasies'),
  (33, 'discover-each-mans-thumbscrew'),
  (34, 'be-royal-in-your-own-fashion'),
  (35, 'master-the-art-of-timing'),
  (36, 'disdain-things-you-cannot-have'),
  (37, 'create-compelling-spectacles'),
  (38, 'think-as-you-like-but-behave-like-others'),
  (39, 'stir-up-waters-to-catch-fish'),
  (40, 'despise-the-free-lunch'),
  (41, 'avoid-stepping-into-a-great-mans-shoes'),
  (42, 'strike-the-shepherd-and-the-sheep-will-scatter'),
  (43, 'work-on-the-hearts-and-minds-of-others'),
  (44, 'disarm-and-infuriate-with-the-mirror-effect'),
  (45, 'preach-the-need-for-change'),
  (46, 'never-appear-too-perfect'),
  (47, 'do-not-go-past-the-mark-you-aimed-for'),
  (48, 'assume-formlessness')
on conflict (law_slug) do nothing;


-- ============================================================
-- 2. Certification programme settings
-- ============================================================

create table if not exists public.certification_program_settings (
  id boolean primary key default true check (id = true),

  programme_enabled boolean not null default false,
  final_assessment_published boolean not null default false,

  -- Incremented automatically whenever the question bank changes.
  assessment_version integer not null default 1
    check (assessment_version > 0),

  pass_percentage integer not null default 80
    check (pass_percentage between 1 and 100),

  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.certification_program_settings (id)
values (true)
on conflict (id) do nothing;


-- ============================================================
-- 3. Private final assessment question bank
-- ============================================================

create table if not exists public.certification_final_questions (
  id uuid primary key default gen_random_uuid(),

  question_en text not null
    check (length(trim(question_en)) > 0),

  question_bn text not null
    check (length(trim(question_bn)) > 0),

  options_en jsonb not null
    check (
      jsonb_typeof(options_en) = 'array'
      and jsonb_array_length(options_en) = 4
    ),

  options_bn jsonb not null
    check (
      jsonb_typeof(options_bn) = 'array'
      and jsonb_array_length(options_bn) = 4
    ),

  correct_option integer not null
    check (correct_option between 0 and 3),

  explanation_en text not null default '',
  explanation_bn text not null default '',

  is_active boolean not null default true,
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists certification_final_questions_active_order_idx
  on public.certification_final_questions(is_active, sort_order);


-- Every question-bank modification advances the assessment version once
-- per SQL statement, including bulk inserts and bulk updates.
create or replace function public.bump_certification_assessment_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.certification_program_settings
  set
    assessment_version = assessment_version + 1,
    updated_at = now()
  where id = true;

  return null;
end;
$$;

drop trigger if exists certification_questions_version_trigger
  on public.certification_final_questions;

create trigger certification_questions_version_trigger
after insert or update or delete
on public.certification_final_questions
for each statement
execute function public.bump_certification_assessment_version();


-- ============================================================
-- 4. Server-controlled student module completions
-- ============================================================

create table if not exists public.certification_module_completions (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,

  law_slug text not null
    references public.certification_modules(law_slug)
    on delete restrict,

  completed_at timestamptz not null default now(),

  constraint certification_module_completion_unique
    unique (user_id, law_slug)
);

create index if not exists certification_module_completions_user_idx
  on public.certification_module_completions(user_id, completed_at desc);


-- ============================================================
-- 5. Server-graded final assessment attempts
-- ============================================================

create table if not exists public.certification_final_attempts (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,

  score integer not null check (score >= 0),
  total_questions integer not null check (total_questions > 0),

  assessment_version integer not null default 1
    check (assessment_version > 0),

  percentage integer not null check (percentage between 0 and 100),
  passed boolean not null,

  -- Contains submitted question IDs and selected option indexes only.
  -- Correct answers are never copied into this history.
  answers jsonb not null
    check (jsonb_typeof(answers) = 'array'),

  created_at timestamptz not null default now(),

  constraint certification_final_attempt_score_consistent
    check (score <= total_questions)
);

create index if not exists certification_final_attempts_user_created_idx
  on public.certification_final_attempts(user_id, created_at desc);


-- ============================================================
-- 6. Issued certificates
-- ============================================================

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),

  certificate_id text not null unique
    check (certificate_id ~ '^PL-[0-9]{4}-[A-F0-9]{32}$'),

  user_id uuid not null unique
    references auth.users(id) on delete restrict,

  qualification text not null default 'MASTER OF THE 48 LAWS OF POWER',

  issued_at timestamptz not null default now(),

  status text not null default 'active'
    check (status in ('active', 'revoked')),

  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  revocation_reason text,

  constraint certificate_revocation_consistency
    check (
      (
        status = 'active'
        and revoked_at is null
        and revoked_by is null
        and revocation_reason is null
      )
      or
      (
        status = 'revoked'
        and revoked_at is not null
        and revoked_by is not null
        and length(trim(coalesce(revocation_reason, ''))) > 0
      )
    )
);

create index if not exists certificates_status_issued_idx
  on public.certificates(status, issued_at desc);


-- ============================================================
-- 7. Row Level Security
-- ============================================================

alter table public.certification_modules enable row level security;
alter table public.certification_program_settings enable row level security;
alter table public.certification_final_questions enable row level security;
alter table public.certification_module_completions enable row level security;
alter table public.certification_final_attempts enable row level security;
alter table public.certificates enable row level security;


-- Module catalogue: administrators only.
drop policy if exists "Certification admins manage module catalogue"
  on public.certification_modules;

create policy "Certification admins manage module catalogue"
on public.certification_modules
for all
to authenticated
using ((select public.is_powerlab_admin()))
with check ((select public.is_powerlab_admin()));


-- Programme settings: administrators only.
drop policy if exists "Certification admins manage programme settings"
  on public.certification_program_settings;

create policy "Certification admins manage programme settings"
on public.certification_program_settings
for all
to authenticated
using ((select public.is_powerlab_admin()))
with check ((select public.is_powerlab_admin()));


-- Private final question bank: administrators only.
drop policy if exists "Certification admins manage final questions"
  on public.certification_final_questions;

create policy "Certification admins manage final questions"
on public.certification_final_questions
for all
to authenticated
using ((select public.is_powerlab_admin()))
with check ((select public.is_powerlab_admin()));


-- Students can read only their own module completion history.
drop policy if exists "Students read own certification completions"
  on public.certification_module_completions;

create policy "Students read own certification completions"
on public.certification_module_completions
for select
to authenticated
using (user_id = (select auth.uid()));


drop policy if exists "Certification admins read all completions"
  on public.certification_module_completions;

create policy "Certification admins read all completions"
on public.certification_module_completions
for select
to authenticated
using ((select public.is_powerlab_admin()));


-- Students can read only their own final assessment attempts.
drop policy if exists "Students read own certification attempts"
  on public.certification_final_attempts;

create policy "Students read own certification attempts"
on public.certification_final_attempts
for select
to authenticated
using (user_id = (select auth.uid()));


drop policy if exists "Certification admins read all attempts"
  on public.certification_final_attempts;

create policy "Certification admins read all attempts"
on public.certification_final_attempts
for select
to authenticated
using ((select public.is_powerlab_admin()));


-- Students can read only their own certificate records.
drop policy if exists "Students read own certificates"
  on public.certificates;

create policy "Students read own certificates"
on public.certificates
for select
to authenticated
using (user_id = (select auth.uid()));


drop policy if exists "Certification admins read all certificates"
  on public.certificates;

create policy "Certification admins read all certificates"
on public.certificates
for select
to authenticated
using ((select public.is_powerlab_admin()));


-- ============================================================
-- 8. Explicit table permissions
-- ============================================================

revoke all on public.certification_modules
  from anon, authenticated;

revoke all on public.certification_program_settings
  from anon, authenticated;

revoke all on public.certification_final_questions
  from anon, authenticated;

revoke all on public.certification_module_completions
  from anon, authenticated;

revoke all on public.certification_final_attempts
  from anon, authenticated;

revoke all on public.certificates
  from anon, authenticated;


-- Admin permissions are additionally restricted by RLS.
grant select, update
  on public.certification_modules to authenticated;

grant select, update
  on public.certification_program_settings to authenticated;

grant select, insert, update, delete
  on public.certification_final_questions to authenticated;

-- No student INSERT, UPDATE or DELETE permission on these records.
grant select
  on public.certification_module_completions to authenticated;

grant select
  on public.certification_final_attempts to authenticated;

grant select
  on public.certificates to authenticated;


-- ============================================================
-- Student-facing status RPC.
-- Returns module readiness, the student's own completion slugs,
-- programme state and latest attempt metadata. Never returns answer keys.
create or replace function public.get_certification_student_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_result jsonb;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = v_user_id
      and role = 'student'
  ) then
    raise exception 'Student account required.';
  end if;

  select jsonb_build_object(
    'modules',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'law_slug', m.law_slug,
          'law_number', m.law_number,
          'is_ready', m.is_ready
        )
        order by m.law_number
      )
      from public.certification_modules m
    ), '[]'::jsonb),

    'completed_law_slugs',
    coalesce((
      select jsonb_agg(c.law_slug order by m.law_number)
      from public.certification_module_completions c
      join public.certification_modules m
        on m.law_slug = c.law_slug
      where c.user_id = v_user_id
    ), '[]'::jsonb),

    'programme_enabled',
    coalesce((
      select s.programme_enabled
      from public.certification_program_settings s
      where s.id = true
    ), false),

    'final_assessment_published',
    coalesce((
      select s.final_assessment_published
      from public.certification_program_settings s
      where s.id = true
    ), false),

    'pass_percentage',
    coalesce((
      select s.pass_percentage
      from public.certification_program_settings s
      where s.id = true
    ), 80),

    'assessment_version',
    coalesce((
      select s.assessment_version
      from public.certification_program_settings s
      where s.id = true
    ), 1),

    'latest_attempt',
    coalesce((
      select jsonb_build_object(
        'score', a.score,
        'total_questions', a.total_questions,
        'percentage', a.percentage,
        'passed', a.passed,
        'assessment_version', a.assessment_version,
        'created_at', a.created_at
      )
      from public.certification_final_attempts a
      where a.user_id = v_user_id
      order by a.created_at desc, a.id desc
      limit 1
    ), 'null'::jsonb)
  )
  into v_result;

  return v_result;
end;
$$;


-- Student-facing final question RPC.
-- Deliberately excludes correct_option and explanations.
create or replace function public.get_certification_final_questions()
returns table (
  id uuid,
  question_en text,
  question_bn text,
  options_en jsonb,
  options_bn jsonb,
  sort_order integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_module_count integer;
  v_ready_count integer;
  v_completed_count integer;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = v_user_id
      and role = 'student'
  ) then
    raise exception 'Student account required.';
  end if;

  if not exists (
    select 1
    from public.certification_program_settings
    where id = true
      and final_assessment_published = true
  ) then
    raise exception 'The final assessment is not currently published.';
  end if;

  select count(*), count(*) filter (where is_ready = true)
  into v_module_count, v_ready_count
  from public.certification_modules;

  if v_module_count <> 48 or v_ready_count <> 48 then
    raise exception 'All 48 modules must be approved before the final assessment.';
  end if;

  select count(*)
  into v_completed_count
  from public.certification_module_completions c
  join public.certification_modules m
    on m.law_slug = c.law_slug
  where c.user_id = v_user_id
    and m.is_ready = true;

  if v_completed_count <> 48 then
    raise exception 'All 48 approved modules must be completed before the final assessment.';
  end if;

  return query
  select
    q.id,
    q.question_en,
    q.question_bn,
    q.options_en,
    q.options_bn,
    q.sort_order
  from public.certification_final_questions q
  where q.is_active = true
  order by q.sort_order, q.id;
end;
$$;


-- 9. Trusted module completion RPC
-- ============================================================

create or replace function public.complete_certification_module(
  p_law_slug text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = v_user_id
      and role = 'student'
  ) then
    raise exception 'Student account required.';
  end if;

  if not exists (
    select 1
    from public.certification_modules
    where law_slug = p_law_slug
      and is_ready = true
  ) then
    raise exception 'This module is not approved for certification.';
  end if;

  insert into public.certification_module_completions (
    user_id,
    law_slug
  )
  values (
    v_user_id,
    p_law_slug
  )
  on conflict (user_id, law_slug) do nothing;
end;
$$;


-- ============================================================
-- 10. Server-side final assessment grading RPC
-- ============================================================

create or replace function public.submit_certification_final_assessment(
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_pass_percentage integer;
  v_assessment_version integer;
  v_total integer;
  v_answer_count integer;
  v_distinct_count integer;
  v_matching_count integer;
  v_valid_count integer;
  v_module_count integer;
  v_ready_count integer;
  v_completed_count integer;
  v_score integer;
  v_percentage integer;
  v_passed boolean;
  v_attempt_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = v_user_id
      and role = 'student'
  ) then
    raise exception 'Student account required.';
  end if;

  -- The comprehensive assessment is available only after all
  -- 48 approved modules have been completed.
  select count(*), count(*) filter (where is_ready = true)
  into v_module_count, v_ready_count
  from public.certification_modules;

  if v_module_count <> 48 or v_ready_count <> 48 then
    raise exception 'All 48 modules must be approved before the final assessment.';
  end if;

  select count(*)
  into v_completed_count
  from public.certification_module_completions c
  join public.certification_modules m
    on m.law_slug = c.law_slug
  where c.user_id = v_user_id
    and m.is_ready = true;

  if v_completed_count <> 48 then
    raise exception 'All 48 approved modules must be completed before the final assessment.';
  end if;

  if jsonb_typeof(p_answers) is distinct from 'array' then
    raise exception 'Answers must be a JSON array.';
  end if;

  select pass_percentage, assessment_version
  into v_pass_percentage, v_assessment_version
  from public.certification_program_settings
  where id = true
    and final_assessment_published = true;

  if not found then
    raise exception 'The final assessment is not currently published.';
  end if;

  select count(*)
  into v_total
  from public.certification_final_questions
  where is_active = true;

  if v_total = 0 then
    raise exception 'No final assessment questions are available.';
  end if;

  select
    count(*),
    count(distinct a.question_id),
    count(q.id),
    count(*) filter (
      where a.selected_option between 0 and 3
    )
  into
    v_answer_count,
    v_distinct_count,
    v_matching_count,
    v_valid_count
  from jsonb_to_recordset(p_answers)
    as a(question_id uuid, selected_option integer)
  left join public.certification_final_questions q
    on q.id = a.question_id
   and q.is_active = true;

  if v_answer_count <> v_total
     or v_distinct_count <> v_total
     or v_matching_count <> v_total
     or v_valid_count <> v_total then
    raise exception 'Submitted answers do not match the published assessment.';
  end if;

  select count(*)
  into v_score
  from jsonb_to_recordset(p_answers)
    as a(question_id uuid, selected_option integer)
  join public.certification_final_questions q
    on q.id = a.question_id
  where q.is_active = true
    and q.correct_option = a.selected_option;

  v_percentage := round((v_score::numeric * 100) / v_total)::integer;
  v_passed := v_percentage >= v_pass_percentage;

  insert into public.certification_final_attempts (
    user_id,
    score,
    total_questions,
    assessment_version,
    percentage,
    passed,
    answers
  )
  values (
    v_user_id,
    v_score,
    v_total,
    v_assessment_version,
    v_percentage,
    v_passed,
    p_answers
  )
  returning id into v_attempt_id;

  return jsonb_build_object(
    'attempt_id', v_attempt_id,
    'score', v_score,
    'total_questions', v_total,
    'percentage', v_percentage,
    'passed', v_passed,
    'pass_percentage', v_pass_percentage
  );
end;
$$;


-- ============================================================
-- 11. Certificate issuance RPC
-- ============================================================

create or replace function public.issue_powerlab_certificate()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_certificate_id text;
  v_full_name text;
  v_module_count integer;
  v_ready_count integer;
  v_completed_count integer;
  v_assessment_version integer;
  v_latest_attempt_version integer;
  v_latest_attempt_passed boolean;
  v_certificate public.certificates%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = v_user_id
      and role = 'student'
  ) then
    raise exception 'Student account required.';
  end if;

  select assessment_version
  into v_assessment_version
  from public.certification_program_settings
  where id = true
    and programme_enabled = true
    and final_assessment_published = true;

  if not found then
    raise exception 'The certification programme is not enabled.';
  end if;

  select full_name
  into v_full_name
  from public.profiles
  where id = v_user_id;

  if coalesce(trim(v_full_name), '') = '' then
    raise exception 'Please complete your profile name before certification.';
  end if;

  select count(*), count(*) filter (where is_ready = true)
  into v_module_count, v_ready_count
  from public.certification_modules;

  if v_module_count <> 48 or v_ready_count <> 48 then
    raise exception 'All 48 modules must be approved before certificate issuance.';
  end if;

  select count(*)
  into v_completed_count
  from public.certification_module_completions c
  join public.certification_modules m
    on m.law_slug = c.law_slug
  where c.user_id = v_user_id
    and m.is_ready = true;

  if v_completed_count <> 48 then
    raise exception 'All 48 approved modules must be completed.';
  end if;

  -- The most recent attempt must be a pass for the currently
  -- published question-bank version.
  select passed, assessment_version
  into v_latest_attempt_passed, v_latest_attempt_version
  from public.certification_final_attempts
  where user_id = v_user_id
  order by created_at desc, id desc
  limit 1;

  if not found
     or v_latest_attempt_passed is distinct from true
     or v_latest_attempt_version <> v_assessment_version then
    raise exception 'A passing attempt on the current assessment version is required.';
  end if;

  if exists (
    select 1
    from public.certificates
    where user_id = v_user_id
  ) then
    raise exception 'A certificate record already exists for this account.';
  end if;

  v_certificate_id :=
    'PL-' || to_char(current_date, 'YYYY') || '-'
    || upper(replace(gen_random_uuid()::text, '-', ''));

  insert into public.certificates (
    certificate_id,
    user_id
  )
  values (
    v_certificate_id,
    v_user_id
  )
  returning * into v_certificate;

  return jsonb_build_object(
    'certificate_id', v_certificate.certificate_id,
    'qualification', v_certificate.qualification,
    'issued_at', v_certificate.issued_at,
    'status', v_certificate.status
  );
end;
$$;


-- ============================================================
-- 12. Public certificate verification RPC
-- ============================================================

create or replace function public.verify_powerlab_certificate(
  p_certificate_id text
)
returns table (
  certificate_id text,
  recipient_name text,
  qualification text,
  issued_at timestamptz,
  status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.certificate_id,
    p.full_name,
    c.qualification,
    c.issued_at,
    c.status
  from public.certificates c
  join public.profiles p
    on p.id = c.user_id
  where c.certificate_id = upper(trim(p_certificate_id));
$$;


-- ============================================================
-- 13. Admin certificate revocation RPC
-- ============================================================

create or replace function public.revoke_powerlab_certificate(
  p_certificate_id text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
begin
  v_admin_id := auth.uid();

  if v_admin_id is null
     or not public.is_powerlab_admin() then
    raise exception 'Administrator permission required.';
  end if;

  if length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'A revocation reason of at least five characters is required.';
  end if;

  update public.certificates
  set
    status = 'revoked',
    revoked_at = now(),
    revoked_by = v_admin_id,
    revocation_reason = trim(p_reason)
  where certificate_id = upper(trim(p_certificate_id))
    and status = 'active';

  if not found then
    raise exception 'Active certificate not found.';
  end if;
end;
$$;


-- ============================================================
-- 14. Function permissions
-- ============================================================

revoke all on function public.bump_certification_assessment_version()
  from public, anon, authenticated;

revoke all on function public.get_certification_student_status()
  from public, anon;

revoke all on function public.get_certification_final_questions()
  from public, anon;

grant execute on function public.get_certification_student_status()
  to authenticated;

grant execute on function public.get_certification_final_questions()
  to authenticated;

revoke all on function public.complete_certification_module(text)
  from public, anon;

revoke all on function public.submit_certification_final_assessment(jsonb)
  from public, anon;

revoke all on function public.issue_powerlab_certificate()
  from public, anon;

revoke all on function public.verify_powerlab_certificate(text)
  from public;

revoke all on function public.revoke_powerlab_certificate(text, text)
  from public, anon;


grant execute on function public.complete_certification_module(text)
  to authenticated;

grant execute on function public.submit_certification_final_assessment(jsonb)
  to authenticated;

grant execute on function public.issue_powerlab_certificate()
  to authenticated;

grant execute on function public.verify_powerlab_certificate(text)
  to anon, authenticated;

grant execute on function public.revoke_powerlab_certificate(text, text)
  to authenticated;


commit;
