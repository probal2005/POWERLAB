begin;

create table public.certificate_design (
  id boolean primary key default true check (id),
  title_en text not null default '' check (char_length(title_en) <= 100),
  title_bn text not null default '' check (char_length(title_bn) <= 100),
  subtitle_en text not null default '' check (char_length(subtitle_en) <= 160),
  subtitle_bn text not null default '' check (char_length(subtitle_bn) <= 160),
  accent text not null default '#a37139' check (accent ~ '^#[0-9A-Fa-f]{6}$'),
  frame text not null default 'classic' check (frame in ('classic', 'minimal')),
  partner_name text not null default '' check (char_length(partner_name) <= 100),
  partner_logo text not null default '' check (
    partner_logo = '' or (
      char_length(btrim(partner_name)) > 0
      and octet_length(partner_logo) <= 349552
      and partner_logo ~ '^data:image/(png;base64,iVBORw0KGgo|jpeg;base64,/9j/|webp;base64,UklGR)[A-Za-z0-9+/]*={0,2}$'
    )
  )
);

insert into public.certificate_design default values;
alter table public.certificate_design enable row level security;
revoke all on public.certificate_design from public, anon, authenticated;
grant select on public.certificate_design to authenticated;
grant update (title_en, title_bn, subtitle_en, subtitle_bn, accent, frame, partner_name, partner_logo)
  on public.certificate_design to authenticated;

create policy "Admins read certificate design"
  on public.certificate_design for select to authenticated
  using ((select public.is_powerlab_admin()));

create policy "Admins publish certificate design"
  on public.certificate_design for update to authenticated
  using ((select public.is_powerlab_admin()))
  with check ((select public.is_powerlab_admin()));

alter table public.certificates add column design_snapshot jsonb;

create function public.snapshot_powerlab_certificate_design()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select to_jsonb(design) - 'id'
  into new.design_snapshot
  from public.certificate_design design
  where design.id;
  return new;
end;
$$;

revoke all on function public.snapshot_powerlab_certificate_design() from public, anon, authenticated;

create trigger snapshot_powerlab_certificate_design
  before insert on public.certificates
  for each row execute function public.snapshot_powerlab_certificate_design();

commit;
