-- POWERLAB: Shared website content managed through the admin panel.
-- Run this migration manually in the Supabase SQL Editor.
--
-- Content model:
--   content_categories: bilingual category metadata
--   content_laws: bilingual law metadata, lesson sections and assessments
--
-- Existing bundled content and browser localStorage are not modified here.

begin;

-- 1. Categories.
create table if not exists public.content_categories (
  id text primary key
    check (length(trim(id)) between 1 and 100),
  label_en text not null
    check (length(trim(label_en)) > 0),
  label_bn text not null
    check (length(trim(label_bn)) > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Laws, lessons and assessments.
create table if not exists public.content_laws (
  slug text primary key
    check (length(trim(slug)) between 1 and 150),
  number integer not null
    check (number > 0),
  title_en text not null
    check (length(trim(title_en)) > 0),
  title_bn text not null
    check (length(trim(title_bn)) > 0),
  short_en text not null default '',
  short_bn text not null default '',
  category_id text not null
    references public.content_categories(id)
    on update cascade
    on delete restrict,
  sections jsonb not null default '[]'::jsonb
    check (jsonb_typeof(sections) = 'array'),
  assessment jsonb
    check (
      assessment is null
      or jsonb_typeof(assessment) = 'object'
    ),
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

-- Law numbers are intentionally not unique at the database level.
-- The current admin editor swaps numbers through consecutive updates.

create index if not exists content_laws_publication_order_idx
  on public.content_laws(is_published, sort_order, number);

create index if not exists content_laws_category_idx
  on public.content_laws(category_id);

-- 3. Enable Row Level Security.
alter table public.content_categories enable row level security;
alter table public.content_laws enable row level security;

-- 4. Category policies.
drop policy if exists "Anyone can read content categories"
  on public.content_categories;

create policy "Anyone can read content categories"
on public.content_categories
for select
to anon, authenticated
using (true);

drop policy if exists "Admins can insert content categories"
  on public.content_categories;

create policy "Admins can insert content categories"
on public.content_categories
for insert
to authenticated
with check ((select public.is_powerlab_admin()));

drop policy if exists "Admins can update content categories"
  on public.content_categories;

create policy "Admins can update content categories"
on public.content_categories
for update
to authenticated
using ((select public.is_powerlab_admin()))
with check ((select public.is_powerlab_admin()));

drop policy if exists "Admins can delete content categories"
  on public.content_categories;

create policy "Admins can delete content categories"
on public.content_categories
for delete
to authenticated
using ((select public.is_powerlab_admin()));

-- 5. Law policies.
drop policy if exists "Anyone can read published content laws"
  on public.content_laws;

create policy "Anyone can read published content laws"
on public.content_laws
for select
to anon, authenticated
using (is_published = true);

drop policy if exists "Admins can read all content laws"
  on public.content_laws;

create policy "Admins can read all content laws"
on public.content_laws
for select
to authenticated
using ((select public.is_powerlab_admin()));

drop policy if exists "Admins can insert content laws"
  on public.content_laws;

create policy "Admins can insert content laws"
on public.content_laws
for insert
to authenticated
with check ((select public.is_powerlab_admin()));

drop policy if exists "Admins can update content laws"
  on public.content_laws;

create policy "Admins can update content laws"
on public.content_laws
for update
to authenticated
using ((select public.is_powerlab_admin()))
with check ((select public.is_powerlab_admin()));

drop policy if exists "Admins can delete content laws"
  on public.content_laws;

create policy "Admins can delete content laws"
on public.content_laws
for delete
to authenticated
using ((select public.is_powerlab_admin()));

-- 6. Explicit permissions.
revoke all on public.content_categories from anon, authenticated;
revoke all on public.content_laws from anon, authenticated;

grant select on public.content_categories to anon, authenticated;
grant select on public.content_laws to anon, authenticated;

grant insert, update, delete
  on public.content_categories to authenticated;

grant insert, update, delete
  on public.content_laws to authenticated;

commit;
