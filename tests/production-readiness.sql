-- Run against a disposable Supabase database after migrations. Rolls back fixtures.
\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-000000000001', 'audit-student@example.invalid', '{"full_name":"Audit Student","role":"admin"}'),
  ('00000000-0000-4000-8000-000000000002', 'audit-admin@example.invalid', '{"full_name":"Audit Administrator"}'),
  ('00000000-0000-4000-8000-000000000003', 'audit-other@example.invalid', '{"full_name":"Audit Other"}');
update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-000000000002';
insert into public.student_bookmarks(user_id, law_slug)
values ('00000000-0000-4000-8000-000000000003', 'never-outshine-the-master');

insert into public.site_languages (code,name_en,name_native) values ('xx','Fixture','Fixture');
insert into public.site_translations (language_code,translation_key,value) values
  ('xx','ui:Explore','Translated'),
  ('xx','law:never-outshine-the-master:assessment:practical-response:explanation','Private');
insert into public.site_translations (language_code,translation_key,value)
select 'xx','final:assessment:' || id || ':question','Gated'
from public.certification_final_questions order by sort_order limit 1;

set local role anon;
do $$
declare payload jsonb := public.get_powerlab_public_content();
begin
  assert jsonb_array_length(payload->'laws') = 48;
  assert jsonb_array_length(payload->'categories') = 8;
  assert not exists (select 1 from jsonb_array_elements(payload->'laws') l
    where jsonb_array_length(l->'sections') = 0 or l->'assessment' = 'null'::jsonb
      or jsonb_array_length(l->'assessment'->'questions') = 0);
  assert not jsonb_path_exists(payload, '$.laws[*].assessment.questions[*].correctOption');
  assert not jsonb_path_exists(payload, '$.laws[*].assessment.questions[*].explanationEn');
  assert (select count(*) from public.site_languages) = 3;
  assert (select count(*) from public.site_translations) = 1;
  assert public.get_powerlab_public_translations('xx') = '{"ui:Explore":"Translated"}';
  assert not has_function_privilege(current_user, 'public.get_powerlab_final_translations(text)', 'execute');
  assert not has_function_privilege(current_user, 'public.submit_law_assessment(text,jsonb)', 'execute');
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
do $$
declare result jsonb;
begin
  assert (select role from public.profiles) = 'student';
  assert (select count(*) from public.student_bookmarks) = 0;
  assert not has_column_privilege(current_user, 'public.profiles', 'role', 'UPDATE');
  assert not has_column_privilege(current_user, 'public.content_laws', 'assessment', 'SELECT');
  assert not has_table_privilege(current_user, 'public.student_assessment_attempts', 'INSERT');
  begin
    perform public.get_powerlab_admin_content();
    raise exception 'Admin content was exposed to a student';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.set_powerlab_user_role('00000000-0000-4000-8000-000000000003', 'admin');
    raise exception 'Student could change roles';
  exception when insufficient_privilege then null;
  end;
  result := public.submit_law_assessment('never-outshine-the-master', '[0]');
  assert (result->>'passed')::boolean;
  assert (select count(*) from public.student_assessment_attempts) = 1;
  begin
    perform public.submit_law_assessment('never-outshine-the-master', null);
    raise exception 'Null answers were accepted';
  exception when raise_exception then
    assert sqlerrm = 'Answers must be an array';
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
do $$
begin
  assert jsonb_path_exists(public.get_powerlab_admin_content(), '$.laws[*].assessment.questions[*].correctOption');
  assert not jsonb_path_exists(public.get_powerlab_public_content(), '$.laws[*].assessment.questions[*].correctOption');
  perform public.swap_powerlab_law_numbers('never-outshine-the-master', 'assume-formlessness');
  assert (select number from public.content_laws where slug = 'never-outshine-the-master') = 48;
  assert (select number from public.content_laws where slug = 'assume-formlessness') = 1;
  perform public.swap_powerlab_law_numbers('never-outshine-the-master', 'assume-formlessness');
  perform public.set_powerlab_user_role('00000000-0000-4000-8000-000000000003', 'admin');
  assert (select role from public.profiles where id = '00000000-0000-4000-8000-000000000003') = 'admin';
  begin
    update public.certification_program_settings set final_assessment_published = true;
    raise exception 'Unreviewed certification was published';
  exception when raise_exception then
    assert sqlerrm = 'Approve all 48 published modules and activate final assessment questions.';
  end;
  update public.certification_modules set is_ready = true, reviewed_at = now();
  update public.certification_program_settings set final_assessment_published = true, programme_enabled = true;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
do $$
declare
  module record;
  answers jsonb;
  result jsonb;
  certificate jsonb;
begin
  begin
    perform public.complete_certification_module('never-outshine-the-master');
    raise exception 'Certification accepted a lesson without saved completion';
  exception when raise_exception then
    assert sqlerrm = 'Complete the published lesson before confirming this module.';
  end;
  for module in select slug from public.content_laws loop
    insert into public.student_law_progress (user_id, law_slug, status, completed_at)
    values (auth.uid(), module.slug, 'completed', now());
    perform public.complete_certification_module(module.slug);
  end loop;
  assert (select count(*) from public.get_certification_final_questions()) = 12;
  assert (select count(*) from jsonb_each(public.get_powerlab_final_translations('xx'))) = 1;
  reset role;
  select jsonb_agg(jsonb_build_object('question_id', id, 'selected_option', correct_option))
    into answers from public.certification_final_questions;
  set local role authenticated;
  result := public.submit_certification_final_assessment(answers);
  assert (result->>'passed')::boolean;
  certificate := public.issue_powerlab_certificate();
  assert (select status from public.verify_powerlab_certificate(certificate->>'certificate_id')) = 'active';
  perform set_config('powerlab.test_certificate_id', certificate->>'certificate_id', true);
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
do $$
begin
  perform public.revoke_powerlab_certificate(current_setting('powerlab.test_certificate_id'), 'Audit verification');
end;
$$;

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$
begin
  assert (select status from public.verify_powerlab_certificate(current_setting('powerlab.test_certificate_id'))) = 'revoked';
end;
$$;

rollback;
