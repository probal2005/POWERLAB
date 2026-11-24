-- Run in a disposable database with the production migrations applied.
\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-4000-8000-000000000889', 'viewer-history@example.invalid', '{}');
update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-000000000889';

set local role anon;
select public.record_powerlab_viewer('00000000-0000-4000-8000-000000000887', 0);
select public.record_powerlab_viewer('00000000-0000-4000-8000-000000000888', 0);
do $$ begin
  assert not has_function_privilege(current_user, 'public.get_powerlab_visitor_history(integer)', 'EXECUTE');
end $$;

reset role;
update powerlab_internal.visitor_history set last_seen = statement_timestamp() - interval '20 seconds'
where browser_id = '00000000-0000-4000-8000-000000000887';

set local role anon;
select public.record_powerlab_viewer('00000000-0000-4000-8000-000000000887', 45000);
select public.record_powerlab_viewer('00000000-0000-4000-8000-000000000887', 0);

reset role;
do $$
declare row_data powerlab_internal.visitor_history%rowtype;
begin
  select * into row_data from powerlab_internal.visitor_history
    where browser_id = '00000000-0000-4000-8000-000000000887';
  assert row_data.visits = 1;
  assert row_data.active_milliseconds between 20000 and 21000;
end;
$$;

update powerlab_internal.visitor_history set last_seen = statement_timestamp() - interval '31 minutes'
where browser_id = '00000000-0000-4000-8000-000000000887';
set local role anon;
select public.record_powerlab_viewer('00000000-0000-4000-8000-000000000887', 25000);

reset role;
do $$
declare row_data powerlab_internal.visitor_history%rowtype;
begin
  select * into row_data from powerlab_internal.visitor_history
    where browser_id = '00000000-0000-4000-8000-000000000887';
  assert row_data.visits = 2;
  assert row_data.active_milliseconds between 20000 and 21000;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000889', true);
do $$
declare report jsonb := public.get_powerlab_visitor_history(0);
begin
  assert (report->>'uniqueBrowsers')::integer = 2;
  assert (report->>'totalVisits')::integer = 3;
  assert (report->>'activeSeconds')::integer = 20;
  assert not jsonb_path_exists(report, '$.visitors[*].browser_id');
  assert (select count(*) from jsonb_array_elements(report->'visitors')) = 2;
end;
$$;

rollback;
