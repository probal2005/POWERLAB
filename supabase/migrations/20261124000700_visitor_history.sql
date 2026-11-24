begin;

create table powerlab_internal.visitor_history (
  browser_id uuid primary key,
  visitor_number bigint generated always as identity unique,
  first_seen timestamptz not null,
  last_seen timestamptz not null,
  visits bigint not null default 1,
  active_milliseconds bigint not null default 0
);
alter table powerlab_internal.visitor_history enable row level security;
revoke all on powerlab_internal.visitor_history from public, anon, authenticated;

-- The older one-argument RPC remains available for clients already open at release.
create function public.record_powerlab_viewer(p_browser_id uuid, p_visible_ms integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  checked_at timestamptz := statement_timestamp();
  visible_ms integer := least(25000, greatest(0, coalesce(p_visible_ms, 0)));
begin
  if p_browser_id is null then return; end if;
  perform public.record_powerlab_viewer(p_browser_id);

  insert into powerlab_internal.visitor_history as visitor (browser_id, first_seen, last_seen)
  values (p_browser_id, checked_at, checked_at)
  on conflict (browser_id) do update
  set last_seen = excluded.last_seen,
      visits = visitor.visits + case when excluded.last_seen - visitor.last_seen >= interval '30 minutes' then 1 else 0 end,
      active_milliseconds = visitor.active_milliseconds + case
        when excluded.last_seen - visitor.last_seen <= interval '35 seconds' then
          least(visible_ms, floor(extract(epoch from excluded.last_seen - visitor.last_seen) * 1000)::integer)
        else 0
      end
  where excluded.last_seen > visitor.last_seen;
end;
$$;

revoke all on function public.record_powerlab_viewer(uuid, integer) from public;
grant execute on function public.record_powerlab_viewer(uuid, integer) to anon, authenticated;

create function public.get_powerlab_visitor_history(p_offset integer default 0)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  totals jsonb;
  visitors jsonb;
begin
  if not (select public.is_powerlab_admin()) then
    raise insufficient_privilege using message = 'Administrator permission required.';
  end if;

  select jsonb_build_object(
    'uniqueBrowsers', count(*),
    'totalVisits', coalesce(sum(visits), 0),
    'activeSeconds', floor(coalesce(sum(active_milliseconds), 0) / 1000),
    'trackingSince', min(first_seen)
  ) into totals from powerlab_internal.visitor_history;

  select coalesce(jsonb_agg(to_jsonb(v) order by v."visitorNumber" desc), '[]'::jsonb)
  into visitors
  from (
    select visitor_number as "visitorNumber", first_seen as "firstSeen",
      last_seen as "lastSeen", visits, active_milliseconds / 1000 as "activeSeconds"
    from powerlab_internal.visitor_history
    order by visitor_number desc
    limit 25 offset greatest(coalesce(p_offset, 0), 0)
  ) v;

  return totals || jsonb_build_object('visitors', visitors);
end;
$$;

revoke all on function public.get_powerlab_visitor_history(integer) from public, anon;
grant execute on function public.get_powerlab_visitor_history(integer) to authenticated;

commit;
