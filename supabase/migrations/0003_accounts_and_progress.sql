-- New migration after the theme rename. Existing applied migrations are intact.
alter table public.profiles
  add column display_name text not null default '' check (length(display_name) <= 100),
  add column timezone text not null default 'UTC',
  add column reduce_motion boolean not null default false,
  add column webcam_enabled boolean not null default false,
  add column webcam_corner text not null default 'bottom-right' check (webcam_corner in ('top-left','top-right','bottom-left','bottom-right')),
  add column ambience_enabled boolean not null default false,
  add column music_track text check (music_track in ('silent')),
  add column music_volume double precision not null default 0 check (music_volume between 0 and 1),
  add column room_volume double precision not null default 0 check (room_volume between 0 and 1),
  add column comeback_shown_for_date date,
  add column onboarding_complete boolean not null default false;

create table public.streaks (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  best_streak integer not null default 0 check (best_streak >= current_streak),
  last_active_date date,
  freezes_remaining integer not null default 2 check (freezes_remaining between 0 and 2),
  freezes_reset_at date not null
);
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(), ended_at timestamptz,
  planned_minutes integer check (planned_minutes > 0),
  actual_seconds integer not null default 0 check (actual_seconds between 0 and 21600),
  ended_reason text check (ended_reason in ('completed','stopped_early','abandoned')),
  theme_slug text not null default 'rain-desk' check (theme_slug in ('rain-desk','night-shift','balcony-dusk','dorm-bunk')),
  local_date date not null, task text check (length(task) <= 500),
  last_heartbeat_at timestamptz not null default now(),
  streak_changed boolean not null default false, freeze_used boolean not null default false,
  check ((ended_at is null and ended_reason is null and actual_seconds = 0)
    or (ended_at is not null and ended_reason is not null and ended_at >= started_at)),
  check (last_heartbeat_at >= started_at)
);
create unique index sessions_one_active_per_user on public.sessions(user_id) where ended_at is null;
create index sessions_user_started on public.sessions(user_id, started_at desc);
create index sessions_active_heartbeat on public.sessions(last_heartbeat_at) where ended_at is null;
create table public.day_stats (
  user_id uuid not null references public.profiles(id) on delete cascade,
  local_date date not null, total_seconds bigint not null default 0 check (total_seconds >= 0),
  session_count integer not null default 0 check (session_count >= 0),
  primary key (user_id, local_date)
);

create or replace function auth_private.create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
declare chosen_username text;
begin
  if new.raw_app_meta_data ->> 'provider' = 'email' then chosen_username := lower(new.raw_user_meta_data ->> 'username'); end if;
  -- Magic-link signups have no username. Never derive the public name from email.
  if chosen_username is null or chosen_username !~ '^[a-z0-9_]{3,30}$' then
    chosen_username := 'user_' || right(replace(new.id::text, '-', ''), 20);
  end if;
  insert into public.profiles(id, username, first_name, last_name)
  values (new.id, chosen_username, coalesce(new.raw_user_meta_data ->> 'first_name', ''), coalesce(new.raw_user_meta_data ->> 'last_name', ''));
  insert into public.streaks(user_id, freezes_reset_at)
  values (new.id, (date_trunc('month', now() at time zone 'UTC') + interval '1 month')::date);
  return new;
end;
$$;
insert into public.streaks(user_id, freezes_reset_at)
select id, (date_trunc('month', now() at time zone timezone) + interval '1 month')::date from public.profiles
on conflict (user_id) do nothing;

create function auth_private.validate_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Invalid timezone' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger validate_profile before insert or update on public.profiles
for each row execute function auth_private.validate_profile();

create function auth_private.prepare_session() returns trigger
language plpgsql set search_path = '' as $$
declare v_timezone text; v_cap integer;
begin
  if tg_op = 'INSERT' then
    if current_user in ('authenticated','anon') then
      if new.user_id is distinct from auth.uid() then raise exception 'Not authorized' using errcode = '42501'; end if;
      perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
      if (select count(*) from public.sessions where user_id = new.user_id and started_at > clock_timestamp() - interval '1 hour') >= 30 then
        raise exception 'Start rate limit' using errcode = 'P0001';
      end if;
      new.started_at := clock_timestamp(); new.last_heartbeat_at := new.started_at;
    end if;
    select timezone into strict v_timezone from public.profiles where id = new.user_id;
    new.local_date := (new.started_at at time zone v_timezone)::date;
    new.ended_at := null; new.ended_reason := null; new.actual_seconds := 0;
    new.streak_changed := false; new.freeze_used := false;
  else
    if old.ended_at is not null then
      -- The server's atomic Finish RPC may persist receipt flags; time is immutable.
      if (new.id,new.user_id,new.started_at,new.ended_at,new.planned_minutes,new.actual_seconds,new.ended_reason,new.theme_slug,new.local_date,new.task,new.last_heartbeat_at)
        is distinct from (old.id,old.user_id,old.started_at,old.ended_at,old.planned_minutes,old.actual_seconds,old.ended_reason,old.theme_slug,old.local_date,old.task,old.last_heartbeat_at)
        or (current_user not in ('postgres','service_role') and new is distinct from old) then
        raise exception 'Ended sessions are immutable' using errcode = '23514';
      end if;
      return new;
    end if;
    if (new.id,new.user_id,new.started_at,new.local_date,new.planned_minutes,new.theme_slug)
      is distinct from (old.id,old.user_id,old.started_at,old.local_date,old.planned_minutes,old.theme_slug) then
      raise exception 'Session origin is immutable' using errcode = '23514';
    end if;
    new.actual_seconds := 0;
    if new.last_heartbeat_at is distinct from old.last_heartbeat_at and current_user in ('authenticated','anon') then new.last_heartbeat_at := clock_timestamp(); end if;
    if new.ended_at is not null then
      new.ended_at := greatest(old.started_at, case when current_user in ('postgres','service_role')
        then least(new.ended_at,clock_timestamp()) else clock_timestamp() end);
      v_cap := case when new.ended_reason = 'abandoned' then 5400 else 21600 end;
      new.actual_seconds := least(greatest(floor(extract(epoch from (new.ended_at - old.started_at)))::integer,0),v_cap);
    end if;
  end if;
  return new;
end;
$$;
create trigger prepare_session before insert or update on public.sessions for each row execute function auth_private.prepare_session();

create function auth_private.bank_session() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.ended_at is not null or new.ended_at is null then return new; end if;
  insert into public.day_stats(user_id,local_date,total_seconds,session_count)
  values (new.user_id,new.local_date,new.actual_seconds,1)
  on conflict (user_id,local_date) do update set
    total_seconds = public.day_stats.total_seconds + excluded.total_seconds,
    session_count = public.day_stats.session_count + 1;
  return new;
end;
$$;
create trigger bank_session after update on public.sessions for each row execute function auth_private.bank_session();

create function public.prevent_day_stats_decrease() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.total_seconds < old.total_seconds or new.session_count < old.session_count then
    raise exception 'Banked time cannot decrease' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger prevent_day_stats_decrease before update on public.day_stats for each row execute function public.prevent_day_stats_decrease();
create function auth_private.prevent_best_decrease() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.best_streak < old.best_streak then raise exception 'Best streak cannot decrease' using errcode = '23514'; end if;
  return new;
end;
$$;
create trigger prevent_best_decrease before update on public.streaks for each row execute function auth_private.prevent_best_decrease();
create function auth_private.prevent_history_delete() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- An account deletion cascade removes its parent first. Ordinary history
  -- erasure while the account exists must not lower hours or best streak.
  if exists (select 1 from public.profiles where id = old.user_id) then
    raise exception 'History is retained while the account exists' using errcode = '23514';
  end if;
  return old;
end;
$$;
create trigger retain_sessions before delete on public.sessions for each row execute function auth_private.prevent_history_delete();
create trigger retain_day_stats before delete on public.day_stats for each row execute function auth_private.prevent_history_delete();
create trigger retain_streaks before delete on public.streaks for each row execute function auth_private.prevent_history_delete();

alter table public.sessions enable row level security;
alter table public.day_stats enable row level security;
alter table public.streaks enable row level security;
revoke all on public.sessions,public.day_stats,public.streaks from anon,authenticated;
grant select on public.sessions,public.day_stats,public.streaks to authenticated;
grant insert (id,user_id,planned_minutes,theme_slug,task) on public.sessions to authenticated;
grant update (ended_at,ended_reason,last_heartbeat_at) on public.sessions to authenticated;
grant update (display_name,timezone,selected_theme,show_streak,reduce_motion,webcam_enabled,webcam_corner,
  ambience_enabled,music_track,music_volume,room_volume,comeback_shown_for_date,onboarding_complete) on public.profiles to authenticated;
create policy profiles_update_self on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy sessions_read_self on public.sessions for select to authenticated using ((select auth.uid()) = user_id);
create policy sessions_insert_self on public.sessions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy sessions_update_self on public.sessions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy day_stats_read_self on public.day_stats for select to authenticated using ((select auth.uid()) = user_id);
create policy streaks_read_self on public.streaks for select to authenticated using ((select auth.uid()) = user_id);
revoke all on all functions in schema auth_private from public,anon,authenticated;
revoke all on function public.prevent_day_stats_decrease() from public,anon,authenticated;
