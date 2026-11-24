begin;

alter table public.certificate_design
  add column qualification_en text not null default '' check (char_length(qualification_en) <= 120),
  add column qualification_bn text not null default '' check (char_length(qualification_bn) <= 120);

grant update (qualification_en, qualification_bn)
  on public.certificate_design to authenticated;

create or replace function public.snapshot_powerlab_certificate_design()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select to_jsonb(design) - 'id'
  into new.design_snapshot
  from public.certificate_design design
  where design.id;

  -- Keep the English award name consistent across the issued certificate and public verification.
  new.qualification := coalesce(nullif(btrim(new.design_snapshot ->> 'qualification_en'), ''), new.qualification);
  return new;
end;
$$;

commit;
