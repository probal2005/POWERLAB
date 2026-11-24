begin;

create table if not exists public.student_lesson_notes (
  user_id uuid not null references auth.users(id) on delete cascade,
  law_slug text not null,
  note text not null check (length(note) between 1 and 5000),
  updated_at timestamptz not null default now(),
  primary key (user_id, law_slug)
);

alter table public.student_lesson_notes enable row level security;
revoke all on public.student_lesson_notes from public, anon, authenticated;
grant select, insert, update, delete on public.student_lesson_notes to authenticated;
drop policy if exists "Students manage their own private notes" on public.student_lesson_notes;
create policy "Students manage their own private notes" on public.student_lesson_notes
  for all to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter table public.student_assessment_attempts
  add column if not exists review jsonb check (review is null or jsonb_typeof(review) = 'array');

create or replace function public.submit_law_assessment(p_law_slug text, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  law_row public.content_laws%rowtype;
  question jsonb;
  answer jsonb;
  question_index integer := 0;
  correct_count integer := 0;
  total_count integer;
  percentage_value integer;
  pass_value integer;
  passed_value boolean;
  answer_values integer[] := array[]::integer[];
  review_values jsonb := '[]'::jsonb;
  attempt_id uuid;
  attempted_at timestamptz;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;
  if jsonb_typeof(p_answers) is distinct from 'array' then
    raise exception 'Answers must be an array';
  end if;

  select * into law_row from public.content_laws
  where slug = p_law_slug and is_published = true;
  if not found or law_row.assessment is null
    or coalesce((law_row.assessment->>'isPublished')::boolean, false) is not true then
    raise exception 'Assessment is not available';
  end if;

  total_count := jsonb_array_length(law_row.assessment->'questions');
  if total_count = 0 or jsonb_array_length(p_answers) <> total_count then
    raise exception 'Answer count does not match the assessment';
  end if;

  for question in select value from jsonb_array_elements(law_row.assessment->'questions') loop
    answer := p_answers->question_index;
    if jsonb_typeof(answer) <> 'number' or (answer::text)::integer not between 0 and 3 then
      raise exception 'Invalid answer';
    end if;
    answer_values := array_append(answer_values, (answer::text)::integer);
    review_values := review_values || jsonb_build_array(jsonb_build_object(
      'questionId', question->>'id',
      'questionEn', question->>'questionEn',
      'questionBn', question->>'questionBn',
      'optionsEn', question->'optionsEn',
      'optionsBn', question->'optionsBn',
      'selectedOption', (answer::text)::integer,
      'correct', (answer::text)::integer = (question->>'correctOption')::integer,
      'correctOption', (question->>'correctOption')::integer,
      'explanationEn', coalesce(question->>'explanationEn', ''),
      'explanationBn', coalesce(question->>'explanationBn', '')
    ));
    if (answer::text)::integer = (question->>'correctOption')::integer then
      correct_count := correct_count + 1;
    end if;
    question_index := question_index + 1;
  end loop;

  percentage_value := round(correct_count::numeric * 100 / total_count)::integer;
  pass_value := coalesce((law_row.assessment->>'passPercentage')::integer, 60);
  passed_value := percentage_value >= pass_value;
  insert into public.student_assessment_attempts
    (user_id, law_slug, score, total_questions, percentage, passed, answers, review, created_at)
  values ((select auth.uid()), p_law_slug, correct_count, total_count,
    percentage_value, passed_value, to_jsonb(answer_values), review_values, clock_timestamp())
  returning id, created_at into attempt_id, attempted_at;

  return jsonb_build_object('id', attempt_id, 'score', correct_count,
    'totalQuestions', total_count, 'percentage', percentage_value,
    'passed', passed_value, 'answers', to_jsonb(answer_values),
    'review', review_values, 'timestamp', attempted_at);
end;
$$;

revoke all on function public.submit_law_assessment(text, jsonb) from public, anon;
grant execute on function public.submit_law_assessment(text, jsonb) to authenticated;


create or replace function public.get_powerlab_missed_questions()
returns table (law_slug text, question jsonb, attempted_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  with latest as (
    select distinct on (a.law_slug, q.value->>'questionId')
      a.law_slug, q.value as question, a.created_at
    from public.student_assessment_attempts a
    cross join lateral jsonb_array_elements(a.review) q(value)
    where a.user_id = (select auth.uid()) and q.value->>'questionId' is not null
    order by a.law_slug, q.value->>'questionId', a.created_at desc, a.id desc
  )
  select l.law_slug, l.question, l.created_at
  from latest l
  where l.question->'correct' = 'false'::jsonb
  order by l.created_at desc, l.law_slug, l.question->>'questionId'
  limit 50;
$$;

revoke all on function public.get_powerlab_missed_questions() from public, anon;
grant execute on function public.get_powerlab_missed_questions() to authenticated;

create or replace function public.get_powerlab_assessment_analytics()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select public.is_powerlab_admin()) then
    raise exception 'Administrator permission required.' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'laws', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.number)
      from (
        select l.slug, l.number, l.title_en,
          coalesce(a.attempts, 0) as attempts, coalesce(a.passes, 0) as passes,
          coalesce(p.started, 0) as started, coalesce(p.completed, 0) as completed
        from public.content_laws l
        left join (select law_slug, count(*) attempts, count(*) filter (where passed) passes
          from public.student_assessment_attempts group by law_slug) a on a.law_slug = l.slug
        left join (select law_slug, count(*) started, count(*) filter (where status = 'completed') completed
          from public.student_law_progress group by law_slug) p on p.law_slug = l.slug
      ) t
    ), '[]'::jsonb),
    'questions', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.misses desc, t.law_slug, t.question)
      from (
        select a.law_slug, q.value->>'questionEn' as question,
          count(*) as responses,
          count(*) filter (where q.value->'correct' = 'false'::jsonb) as misses
        from public.student_assessment_attempts a
        cross join lateral jsonb_array_elements(a.review) q(value)
        where q.value->>'questionId' is not null
        group by a.law_slug, q.value->>'questionId', q.value->>'questionEn'
        having count(*) filter (where q.value->'correct' = 'false'::jsonb) > 0
        order by misses desc, a.law_slug, question
        limit 20
      ) t
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_powerlab_assessment_analytics() from public, anon;
grant execute on function public.get_powerlab_assessment_analytics() to authenticated;

commit;
