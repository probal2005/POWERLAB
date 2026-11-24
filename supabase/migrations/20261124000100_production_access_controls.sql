begin;

-- The existing authenticated admin policies also cover SELECT.
-- Public reads need no access to the administrator predicate.
drop policy if exists "Anyone can read enabled site languages" on public.site_languages;
create policy "Anyone can read enabled site languages"
  on public.site_languages for select to anon, authenticated
  using (is_enabled);

-- Translations can contain draft prompts and answer explanations.
create or replace function public.powerlab_is_public_translation(p_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_key like 'final:assessment:%' then false
    when p_key like 'law:%:assessment:%:explanation' then false
    when p_key like 'law:%' then exists (
      select 1 from public.content_laws l
      where l.slug = split_part(p_key, ':', 2) and l.is_published
      and (split_part(p_key, ':', 3) <> 'assessment' or l.assessment->'isPublished' = 'true'::jsonb)
    )
    else true
  end;
$$;

revoke all on function public.powerlab_is_public_translation(text) from public;
grant execute on function public.powerlab_is_public_translation(text) to anon, authenticated;

drop policy if exists "Anyone can read enabled site translations" on public.site_translations;
create policy "Anyone can read enabled site translations"
  on public.site_translations for select to anon, authenticated
  using (exists (
    select 1 from public.site_languages l
    where l.code = site_translations.language_code and l.is_enabled
  ) and public.powerlab_is_public_translation(translation_key));

create or replace function public.get_powerlab_public_translations(p_language text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(t.translation_key, t.value), '{}'::jsonb)
  from public.site_translations t
  join public.site_languages l on l.code = t.language_code
  where t.language_code = p_language and l.is_enabled
    and public.powerlab_is_public_translation(t.translation_key);
$$;

revoke all on function public.get_powerlab_public_translations(text) from public;
grant execute on function public.get_powerlab_public_translations(text) to anon, authenticated;

create or replace function public.get_powerlab_public_content()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'categories', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.sort_order, c.id)
      from public.content_categories c
    ), '[]'::jsonb),
    'laws', coalesce((
      select jsonb_agg(
        (to_jsonb(l) - 'updated_by') || jsonb_build_object(
            'assessment', case
              when coalesce((l.assessment->>'isPublished')::boolean, false)
                is not true then null
              else jsonb_set(l.assessment, '{questions}', coalesce((
                select jsonb_agg(
                  (q.value - 'correctOption' - 'explanationEn' - 'explanationBn')
                  order by q.ordinality
                )
                from jsonb_array_elements(l.assessment->'questions')
                  with ordinality as q(value, ordinality)
              ), '[]'::jsonb), false)
            end
          )
        order by l.sort_order, l.number
      )
      from public.content_laws l
      where l.is_published
    ), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

revoke all on function public.get_powerlab_public_content() from public;
grant execute on function public.get_powerlab_public_content() to anon, authenticated;

create or replace function public.get_powerlab_admin_content()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not (select public.is_powerlab_admin()) then
    raise insufficient_privilege using message = 'Administrator permission required.';
  end if;
  return public.get_powerlab_content();
end;
$$;

revoke all on function public.get_powerlab_admin_content() from public, anon;
grant execute on function public.get_powerlab_admin_content() to authenticated;

create or replace function public.swap_powerlab_law_numbers(p_first text, p_second text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select public.is_powerlab_admin()) then
    raise insufficient_privilege using message = 'Administrator permission required.';
  end if;
  perform slug from public.content_laws
    where slug in (p_first, p_second) order by slug for update;
  update public.content_laws as law
    set number = other.number, sort_order = other.sort_order
    from public.content_laws as other
    where (law.slug = p_first and other.slug = p_second)
       or (law.slug = p_second and other.slug = p_first);
  if not found then
    raise exception 'Could not find both laws to reorder.';
  end if;
end;
$$;

revoke all on function public.swap_powerlab_law_numbers(text, text) from public, anon;
grant execute on function public.swap_powerlab_law_numbers(text, text) to authenticated;

create or replace function public.set_powerlab_user_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Serialize role changes and check the caller's current role after taking the lock.
  perform pg_advisory_xact_lock(240011);
  if not (select public.is_powerlab_admin()) then
    raise insufficient_privilege using message = 'Administrator permission required.';
  end if;
  if p_user_id is null or p_user_id = (select auth.uid())
      or p_role is null or p_role not in ('student', 'admin') then
    raise invalid_parameter_value using message = 'Select another account and a valid role.';
  end if;
  update public.profiles set role = p_role, updated_at = now()
  where id = p_user_id;
  if not found then
    raise no_data_found using message = 'Account not found.';
  end if;
end;
$$;

revoke all on function public.set_powerlab_user_role(uuid, text) from public, anon;
grant execute on function public.set_powerlab_user_role(uuid, text) to authenticated;

create or replace function public.enforce_powerlab_certification_publication()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.programme_enabled and not new.final_assessment_published then
    raise exception 'Publish the final assessment before enabling certification.';
  end if;
  if (new.programme_enabled and not old.programme_enabled)
    or (new.final_assessment_published and not old.final_assessment_published) then
    if (select count(*) from public.certification_modules m
        join public.content_laws l on l.slug = m.law_slug
        where m.is_ready and l.is_published and jsonb_array_length(l.sections) > 0) <> 48
      or not exists (select 1 from public.certification_final_questions where is_active) then
      raise exception 'Approve all 48 published modules and activate final assessment questions.';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_powerlab_certification_publication() from public, anon, authenticated;
drop trigger if exists enforce_powerlab_certification_publication on public.certification_program_settings;
create trigger enforce_powerlab_certification_publication
before update of programme_enabled, final_assessment_published on public.certification_program_settings
for each row execute function public.enforce_powerlab_certification_publication();

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
    (user_id, law_slug, score, total_questions, percentage, passed, answers)
  values ((select auth.uid()), p_law_slug, correct_count, total_count,
    percentage_value, passed_value, to_jsonb(answer_values))
  returning id into attempt_id;

  return jsonb_build_object('id', attempt_id, 'score', correct_count,
    'totalQuestions', total_count, 'percentage', percentage_value,
    'passed', passed_value, 'answers', to_jsonb(answer_values),
    'review', review_values, 'timestamp', now());
end;
$$;

revoke all on function public.submit_law_assessment(text, jsonb) from public, anon;
grant execute on function public.submit_law_assessment(text, jsonb) to authenticated;


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
    from public.profiles p
    where p.id = v_user_id
      and p.role = 'student'
  ) then
    raise exception 'Student account required.';
  end if;

  if not exists (
    select 1
    from public.certification_program_settings s
    where s.id = true and s.final_assessment_published and s.programme_enabled
  ) then
    raise exception 'The final assessment is not currently published.';
  end if;

  select count(*), count(*) filter (
    where m.is_ready and l.is_published and jsonb_array_length(l.sections) > 0
  )
  into v_module_count, v_ready_count
  from public.certification_modules m
  left join public.content_laws l on l.slug = m.law_slug;

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

create or replace function public.get_powerlab_final_translations(p_language text)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(t.translation_key, t.value), '{}'::jsonb)
  from public.get_certification_final_questions() q
  join public.site_translations t on t.translation_key in (
    'final:assessment:' || q.id || ':question',
    'final:assessment:' || q.id || ':option:0',
    'final:assessment:' || q.id || ':option:1',
    'final:assessment:' || q.id || ':option:2',
    'final:assessment:' || q.id || ':option:3'
  )
  join public.site_languages l on l.code = t.language_code
  where t.language_code = p_language and l.is_enabled;
$$;

revoke all on function public.get_powerlab_final_translations(text) from public, anon;
grant execute on function public.get_powerlab_final_translations(text) to authenticated;

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

  if not exists (
    select 1 from public.student_law_progress p
    join public.content_laws l on l.slug = p.law_slug
    where p.user_id = v_user_id and p.law_slug = p_law_slug
      and p.status = 'completed' and l.is_published
  ) then
    raise exception 'Complete the published lesson before confirming this module.';
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
  select count(*), count(*) filter (
    where m.is_ready and l.is_published and jsonb_array_length(l.sections) > 0
  )
  into v_module_count, v_ready_count
  from public.certification_modules m
  left join public.content_laws l on l.slug = m.law_slug;

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
    and final_assessment_published = true
    and programme_enabled = true
  for share;

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

  select count(*), count(*) filter (
    where m.is_ready and l.is_published and jsonb_array_length(l.sections) > 0
  )
  into v_module_count, v_ready_count
  from public.certification_modules m
  left join public.content_laws l on l.slug = m.law_slug;

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

commit;
