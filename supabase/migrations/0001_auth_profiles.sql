-- New migration; apply once before enabling registration.
create schema if not exists auth_private;
create extension if not exists pgcrypto with schema extensions;
revoke all on schema auth_private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,30}$'),
  first_name text not null default '',
  last_name text not null default '',
  selected_character text not null default 'rain-desk' check (selected_character in ('rain-desk','night-shift','balcony-dusk','dorm-bunk')),
  show_streak boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
create policy profiles_read_self on public.profiles for select to authenticated using ((select auth.uid()) = id);

create function auth_private.create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
declare chosen_username text;
begin
  -- OAuth names are provider data, not a username reservation request.
  if new.raw_app_meta_data ->> 'provider' = 'email' then
    chosen_username := lower(new.raw_user_meta_data ->> 'username');
  else
    chosen_username := 'user_' || substring(replace(new.id::text, '-', '') from 1 for 20);
  end if;
  insert into public.profiles(id, username, first_name, last_name)
  values (new.id, chosen_username, coalesce(new.raw_user_meta_data ->> 'first_name', ''), coalesce(new.raw_user_meta_data ->> 'last_name', ''));
  return new;
end;
$$;
revoke all on function auth_private.create_profile() from public, anon, authenticated;
create trigger auth_user_profile after insert on auth.users for each row execute function auth_private.create_profile();

-- No admin key is used by the application. A separate high-entropy lookup
-- secret permits the server to resolve a username without exposing emails.
create table auth_private.login_config (
  singleton boolean primary key default true check (singleton),
  secret_hash text not null
);
alter table auth_private.login_config enable row level security;
revoke all on auth_private.login_config from public, anon, authenticated;

create function public.lookup_login_email(p_username text, p_lookup_secret text) returns text
language plpgsql security definer set search_path = '' as $$
declare result text;
begin
  if p_lookup_secret is null or length(p_lookup_secret) < 32 or not exists (
    select 1 from auth_private.login_config
    where singleton and secret_hash = encode(extensions.digest(p_lookup_secret, 'sha256'), 'hex')
  ) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  select u.email into result from public.profiles p join auth.users u on u.id = p.id
  where p.username = lower(trim(p_username));
  return result;
end;
$$;
revoke all on function public.lookup_login_email(text, text) from public;
grant execute on function public.lookup_login_email(text, text) to anon, authenticated;
