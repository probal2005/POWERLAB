-- POWERLAB: Initial user profiles and role-based access.
-- Run this migration in the Supabase SQL Editor.

begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default '',
  role text not null default 'student'
    check (role in ('student', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx
  on public.profiles(role);

alter table public.profiles enable row level security;

-- A security-definer helper avoids recursive profile-policy evaluation.
create or replace function public.is_powerlab_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_powerlab_admin() from public;
grant execute on function public.is_powerlab_admin()
  to authenticated;

drop policy if exists "Users can read their own profile"
  on public.profiles;

create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select public.is_powerlab_admin())
);

drop policy if exists "Admins can read all profiles"
  on public.profiles;

-- Profile creation is handled by the trusted signup trigger.
-- Users may update their own display name, but never their role or email.
revoke all on public.profiles from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;

drop policy if exists "Users can update their own display name"
  on public.profiles;

create policy "Users can update their own display name"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (
  id = (select auth.uid())
);

-- Create a profile automatically whenever Supabase Auth creates a user.
create or replace function public.handle_new_powerlab_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'student'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_powerlab_auth_user_created
  on auth.users;

create trigger on_powerlab_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_powerlab_user();

commit;
