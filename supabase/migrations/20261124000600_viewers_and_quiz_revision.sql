begin;

create schema if not exists powerlab_internal;
revoke all on schema powerlab_internal from public, anon, authenticated;

create table powerlab_internal.viewer_heartbeats (
  browser_id uuid primary key,
  seen_at timestamptz not null
);
alter table powerlab_internal.viewer_heartbeats enable row level security;
create index viewer_heartbeats_seen_at_idx on powerlab_internal.viewer_heartbeats(seen_at);

create function public.record_powerlab_viewer(p_browser_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_browser_id is null then return; end if;
  insert into powerlab_internal.viewer_heartbeats as visits(browser_id, seen_at)
  values (p_browser_id, now())
  on conflict (browser_id) do update set seen_at = excluded.seen_at
    where visits.seen_at < excluded.seen_at - interval '10 seconds';

  delete from powerlab_internal.viewer_heartbeats v
    where v.browser_id in (
      select expired.browser_id from powerlab_internal.viewer_heartbeats expired
      where expired.seen_at < now() - interval '5 minutes'
      order by expired.seen_at limit 50 for update skip locked
    );
end;
$$;

revoke all on function public.record_powerlab_viewer(uuid) from public;
grant execute on function public.record_powerlab_viewer(uuid) to anon, authenticated;

create function public.get_powerlab_viewer_count()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select public.is_powerlab_admin()) then
    raise insufficient_privilege using message = 'Administrator permission required.';
  end if;
  return jsonb_build_object('count', (
    select count(*) from powerlab_internal.viewer_heartbeats
    where seen_at >= now() - interval '60 seconds'
  ), 'checkedAt', now());
end;
$$;

revoke all on function public.get_powerlab_viewer_count() from public, anon;
grant execute on function public.get_powerlab_viewer_count() to authenticated;

alter table public.content_laws add column assessment_revision uuid not null default gen_random_uuid();

create function powerlab_internal.assign_assessment_revision()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.assessment is distinct from old.assessment then
    new.assessment_revision := gen_random_uuid();
  else
    new.assessment_revision := old.assessment_revision;
  end if;
  return new;
end;
$$;

create trigger assign_assessment_revision before update on public.content_laws
  for each row execute function powerlab_internal.assign_assessment_revision();

create function public.submit_powerlab_quiz(p_law_slug text, p_answers jsonb, p_revision uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare revision uuid;
begin
  if (select auth.uid()) is null then
    raise insufficient_privilege using message = 'Authentication required.';
  end if;
  select assessment_revision into revision from public.content_laws
    where slug = p_law_slug and is_published for share;
  if not found then raise exception 'Assessment is not available.'; end if;
  if p_revision is distinct from revision then
    raise exception 'This quiz changed. Reload its questions before submitting.' using errcode = 'PT409';
  end if;
  return public.submit_law_assessment(p_law_slug, p_answers);
end;
$$;

revoke all on function public.submit_powerlab_quiz(text, jsonb, uuid) from public, anon;
grant execute on function public.submit_powerlab_quiz(text, jsonb, uuid) to authenticated;

commit;
