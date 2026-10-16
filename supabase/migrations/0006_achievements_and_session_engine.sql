create table public.achievement_awards (
  user_id uuid not null references public.profiles(id) on delete cascade,
  milestone integer not null check (milestone in (1,2,3,5,7,10,25,50,75,100,200,300,400,500,600)),
  earned_at timestamptz not null default now(), primary key(user_id,milestone)
);
alter table public.achievement_awards enable row level security;
revoke all on public.achievement_awards from public,anon,authenticated;
grant select on public.achievement_awards to authenticated;
create policy awards_read on public.achievement_awards for select to authenticated using (
  user_id=(select auth.uid()) or exists(select 1 from public.profile_cards where user_id=achievement_awards.user_id and is_public)
);
create function auth_private.award_streak_milestones() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.achievement_awards(user_id,milestone)
  select new.user_id,n from unnest(array[1,2,3,5,7,10,25,50,75,100,200,300,400,500,600]) n where n<=new.best_streak
  on conflict do nothing;
  return new;
end;
$$;
create trigger award_streak_milestones after insert or update of best_streak on public.streaks for each row execute function auth_private.award_streak_milestones();
insert into public.achievement_awards(user_id,milestone)
select s.user_id,n from public.streaks s cross join unnest(array[1,2,3,5,7,10,25,50,75,100,200,300,400,500,600]) n where n<=s.best_streak on conflict do nothing;

alter table public.profiles add column personal_tile jsonb not null default '{"mirrored":true,"isVisible":true,"status":"","history":[]}';
alter table public.profiles add constraint personal_tile_shape check (
  jsonb_typeof(personal_tile)='object' and jsonb_typeof(personal_tile->'mirrored')='boolean'
  and jsonb_typeof(personal_tile->'isVisible')='boolean' and jsonb_typeof(personal_tile->'status')='string'
  and length(personal_tile->>'status')<=200 and jsonb_typeof(personal_tile->'history')='array' and jsonb_array_length(personal_tile->'history')<=20
);
grant update(personal_tile) on public.profiles to authenticated;

-- Pure SQL mirror of applyActivity: callers supply a calendar date, not time.
create function public.apply_streak_activity(p_state jsonb,p_date date) returns jsonb
language plpgsql immutable set search_path='' as $$
declare current_n int:=(p_state->>'current')::int; best_n int:=(p_state->>'best')::int;
last_date date:=(p_state->>'lastActiveDate')::date; freezes int:=(p_state->>'freezesRemaining')::int;
reset_date date:=(p_state->>'freezesResetAt')::date; used boolean:=false; changed boolean:=true; gap int;
begin
  if p_date>=reset_date then freezes:=2; reset_date:=(date_trunc('month',p_date)+interval '1 month')::date; end if;
  if last_date=p_date then changed:=false;
  else
    gap:=p_date-last_date;
    if gap=1 then current_n:=current_n+1;
    elsif gap=2 and freezes>0 then freezes:=freezes-1; current_n:=current_n+1; used:=true;
    else current_n:=1; end if;
    best_n:=greatest(best_n,current_n); last_date:=p_date;
  end if;
  return jsonb_build_object('state',jsonb_build_object('current',current_n,'best',best_n,'lastActiveDate',last_date,
    'freezesRemaining',freezes,'freezesResetAt',reset_date),'changed',changed,'freezeUsed',used);
end;
$$;
revoke all on function public.apply_streak_activity(jsonb,date) from public,anon;
grant execute on function public.apply_streak_activity(jsonb,date) to authenticated;

create function public.start_study_session(p_minutes integer,p_theme text,p_task text,p_companions jsonb)
returns public.sessions language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result public.sessions;
begin
  if actor is null then raise exception 'Not authorized' using errcode='42501'; end if;
  if p_minutes is not null and p_minutes not in (5,15,25,50) then raise exception 'Invalid minutes' using errcode='22023'; end if;
  if p_theme not in ('rain-desk','night-shift','balcony-dusk','dorm-bunk') or length(p_task)>500 or not public.valid_companion_selection(p_companions) then raise exception 'Invalid input' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
  select * into result from public.sessions where user_id=actor and ended_at is null for update;
  if found then return result; end if;
  if (select count(*) from public.sessions where user_id=actor and started_at>clock_timestamp()-interval '1 hour')>=30 then raise exception 'Start rate limit'; end if;
  insert into public.sessions(user_id,planned_minutes,theme_slug,task,companions)
  values(actor,p_minutes,p_theme,nullif(trim(p_task),''),p_companions) returning * into result;
  return result;
end;
$$;
create function public.finish_study_session(p_id uuid,p_reason text) returns public.sessions
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result public.sessions; streak public.streaks; activity jsonb; next_state jsonb;
begin
  if actor is null then raise exception 'Not authorized' using errcode='42501'; end if;
  if p_reason not in ('completed','stopped_early') then raise exception 'Invalid reason' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
  select * into result from public.sessions where id=p_id and user_id=actor for update;
  if not found then raise exception 'Session unavailable' using errcode='42501'; end if;
  if result.ended_at is not null then return result; end if;
  select * into streak from public.streaks where user_id=actor for update;
  activity:=public.apply_streak_activity(jsonb_build_object('current',streak.current_streak,'best',streak.best_streak,
    'lastActiveDate',streak.last_active_date,'freezesRemaining',streak.freezes_remaining,'freezesResetAt',streak.freezes_reset_at),result.local_date);
  next_state:=activity->'state';
  update public.streaks set current_streak=(next_state->>'current')::int,best_streak=(next_state->>'best')::int,
    last_active_date=(next_state->>'lastActiveDate')::date,freezes_remaining=(next_state->>'freezesRemaining')::int,
    freezes_reset_at=(next_state->>'freezesResetAt')::date where user_id=actor;
  update public.sessions set ended_at=clock_timestamp(),ended_reason=p_reason,
    streak_changed=(activity->>'changed')::boolean,freeze_used=(activity->>'freezeUsed')::boolean
  where id=p_id returning * into result;
  return result;
end;
$$;
revoke all on function public.start_study_session(integer,text,text,jsonb),public.finish_study_session(uuid,text) from public,anon;
grant execute on function public.start_study_session(integer,text,text,jsonb),public.finish_study_session(uuid,text) to authenticated;
-- All duration and activity accounting now goes through the atomic RPC.
revoke insert,update on public.sessions from authenticated;
revoke insert(id,user_id,planned_minutes,theme_slug,task,companions) on public.sessions from authenticated;
revoke update(ended_at,ended_reason,last_heartbeat_at,companions) on public.sessions from authenticated;
grant update(last_heartbeat_at,companions) on public.sessions to authenticated;
revoke all on function auth_private.award_streak_milestones() from public,anon,authenticated;
