-- Close gaps found in the live POWERLAB project:
-- * expose published content through a sanitizing RPC, never the answer keys;
-- * grade lesson assessments in Postgres and persist attempts;
-- * make bundled content import idempotent without replacing edited content;
-- * keep private assessment payloads accessible only to administrators.

begin;

create or replace function public.get_powerlab_content()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
  admin_user boolean := coalesce((select public.is_powerlab_admin()), false);
begin
  select jsonb_build_object(
    'categories', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.sort_order, c.id)
      from public.content_categories c
    ), '[]'::jsonb),
    'laws', coalesce((
      select jsonb_agg(
        case when admin_user then to_jsonb(l)
          else to_jsonb(l) || jsonb_build_object(
            'assessment', case when l.assessment is null then null else
              jsonb_set(l.assessment, '{questions}', coalesce((
                select jsonb_agg(q.value - 'correctOption' order by q.ordinality)
                from jsonb_array_elements(l.assessment->'questions') with ordinality as q(value, ordinality)
              ), '[]'::jsonb), false)
            end
          )
        end order by l.sort_order, l.number
      )
      from public.content_laws l
      where admin_user or l.is_published
    ), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

revoke all on function public.get_powerlab_content() from public;
grant execute on function public.get_powerlab_content() to anon, authenticated;

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
  correctness_values boolean[] := array[]::boolean[];
  attempt_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;
  if jsonb_typeof(p_answers) <> 'array' then
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
    if (answer::text)::integer = (question->>'correctOption')::integer then
      correct_count := correct_count + 1;
      correctness_values := array_append(correctness_values, true);
    else
      correctness_values := array_append(correctness_values, false);
    end if;
    question_index := question_index + 1;
  end loop;

  percentage_value := round(correct_count::numeric * 100 / total_count)::integer;
  pass_value := coalesce((law_row.assessment->>'passPercentage')::integer, 60);
  passed_value := percentage_value >= pass_value;
  insert into public.student_assessment_attempts
    (user_id, law_slug, score, total_questions, percentage, passed, answers)
  values ((select auth.uid()), p_law_slug, correct_count, total_count,
    percentage_value, passed_value, to_jsonb(answer_values))
  returning id into attempt_id;

  return jsonb_build_object('id', attempt_id, 'score', correct_count,
    'totalQuestions', total_count, 'percentage', percentage_value,
    'passed', passed_value, 'answers', to_jsonb(answer_values),
    'reviewCorrect', to_jsonb(correctness_values),
    'timestamp', now());
end;
$$;

revoke all on function public.submit_law_assessment(text, jsonb) from public, anon;
grant execute on function public.submit_law_assessment(text, jsonb) to authenticated;

-- Students can no longer use the REST table endpoint to retrieve answer keys.
revoke select on public.content_laws from anon, authenticated;
grant select (slug, number, title_en, title_bn, short_en, short_bn,
  category_id, sections, is_published, sort_order, created_at, updated_at)
  on public.content_laws to anon, authenticated;
-- Assessment keys are retrieved through get_powerlab_content() by admins only;
-- students receive a sanitized assessment and submit answers to the grading RPC.

commit;
