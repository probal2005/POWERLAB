-- Add admin-managed website languages and interface/content translations.
-- This migration is additive; existing English and Bengali content is unchanged.

begin;

create table if not exists public.site_languages (
  code text primary key
    check (code ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
  name_en text not null check (length(trim(name_en)) > 0),
  name_native text not null check (length(trim(name_native)) > 0),
  is_enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.site_languages (code, name_en, name_native, is_enabled, sort_order)
values ('en', 'English', 'English', true, 0),
       ('bn', 'Bengali', 'বাংলা', true, 1)
on conflict (code) do nothing;

create table if not exists public.site_translations (
  language_code text not null
    references public.site_languages(code) on update cascade on delete cascade,
  translation_key text not null
    check (length(trim(translation_key)) between 1 and 500),
  value text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (language_code, translation_key)
);

create index if not exists site_languages_enabled_order_idx
  on public.site_languages(is_enabled, sort_order, code);

alter table public.site_languages enable row level security;
alter table public.site_translations enable row level security;

drop policy if exists "Anyone can read enabled site languages"
  on public.site_languages;
create policy "Anyone can read enabled site languages"
on public.site_languages
for select to anon, authenticated
using (is_enabled or (select public.is_powerlab_admin()));

drop policy if exists "Admins manage site languages"
  on public.site_languages;
create policy "Admins manage site languages"
on public.site_languages
for all to authenticated
using ((select public.is_powerlab_admin()))
with check ((select public.is_powerlab_admin()));

drop policy if exists "Anyone can read enabled site translations"
  on public.site_translations;
create policy "Anyone can read enabled site translations"
on public.site_translations
for select to anon, authenticated
using (
  exists (
    select 1 from public.site_languages language
    where language.code = language_code and language.is_enabled
  )
  or (select public.is_powerlab_admin())
);

drop policy if exists "Admins manage site translations"
  on public.site_translations;
create policy "Admins manage site translations"
on public.site_translations
for all to authenticated
using ((select public.is_powerlab_admin()))
with check ((select public.is_powerlab_admin()));

revoke all on public.site_languages, public.site_translations from anon, authenticated;
grant select on public.site_languages, public.site_translations to anon, authenticated;
grant insert, update, delete on public.site_languages, public.site_translations to authenticated;

commit;
