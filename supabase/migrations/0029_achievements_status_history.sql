create table public.achievement_definitions (
 id text primary key, kind text not null check(kind in('streak','study-seconds','session-count')),
 threshold bigint not null check(threshold>0), name_key text not null, description_key text not null
);
alter table public.achievement_definitions enable row level security;
grant select on public.achievement_definitions to authenticated;
create policy definitions_read on public.achievement_definitions for select to authenticated using(true);
-- Streak values come from the existing canonical DB milestone constraint.
insert into public.achievement_definitions
select 'streak-'||n,'streak',n,'roadmap.streakBadge','roadmap.streakRequirement'
from unnest(array[1,2,3,5,7,10,25,50,75,100,200,300,400,500,600]) n;
insert into public.achievement_definitions select 'seconds-'||n,'study-seconds',n,'roadmap.timeBadge','roadmap.timeRequirement' from unnest(array[3600,36000,180000,360000]) n;
insert into public.achievement_definitions select 'sessions-'||n,'session-count',n,'roadmap.sessionBadge','roadmap.sessionRequirement' from unnest(array[1,10,50,100]) n;
create table public.user_achievements (
 user_id uuid references public.profiles(id) on delete cascade,
 achievement_id text references public.achievement_definitions(id), earned_at timestamptz not null default now(), primary key(user_id,achievement_id)
);
alter table public.user_achievements enable row level security;
revoke all on public.user_achievements from public,anon,authenticated;
grant select on public.user_achievements to authenticated;
create policy earned_visible on public.user_achievements for select to authenticated using(user_id=auth.uid() or exists(select 1 from public.profile_cards where user_id=user_achievements.user_id and is_public));
create function auth_private.evaluate_achievements(actor uuid) returns void language sql security definer set search_path='' as $$
 insert into public.user_achievements(user_id,achievement_id)
 select actor,d.id from public.achievement_definitions d where d.threshold<=case d.kind
 when 'streak' then coalesce((select best_streak from public.streaks where user_id=actor),0)
 when 'study-seconds' then coalesce((select sum(actual_seconds) from public.sessions where user_id=actor and ended_at is not null),0)
 else (select count(*) from public.sessions where user_id=actor and ended_at is not null) end
 on conflict do nothing;
$$;
create function auth_private.evaluate_achievement_trigger() returns trigger language plpgsql security definer set search_path='' as $$
begin perform auth_private.evaluate_achievements(new.user_id);return new;end;$$;
create trigger zz_session_achievements after update of ended_at on public.sessions for each row when(new.ended_at is not null) execute function auth_private.evaluate_achievement_trigger();
create trigger zz_streak_achievements after insert or update of best_streak on public.streaks for each row execute function auth_private.evaluate_achievement_trigger();
do $$declare actor uuid;begin for actor in select id from public.profiles loop perform auth_private.evaluate_achievements(actor);end loop;end;$$;
revoke all on function auth_private.evaluate_achievements(uuid),auth_private.evaluate_achievement_trigger() from public,anon,authenticated;

create table public.profile_status_events (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 text text not null check(length(text)<=200), created_at timestamptz not null default now()
);
create index status_history_order on public.profile_status_events(user_id,created_at desc,id desc);
alter table public.profile_status_events enable row level security;
revoke all on public.profile_status_events from public,anon,authenticated;
grant select on public.profile_status_events to authenticated;
create policy own_status_events on public.profile_status_events for select to authenticated using(user_id=auth.uid());
insert into public.profile_status_events(user_id,text,created_at)
select p.id,e->>'text',(e->>'createdAt')::timestamptz from public.profiles p cross join lateral jsonb_array_elements(p.personal_tile->'history') e;
-- Profile JSON retains current status and the legacy recent-history projection.
-- Only this trusted operation can write it; old clients cannot replace history.
revoke update(personal_tile) on public.profiles from authenticated;
create function public.update_personal_tile(p_patch jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();current_tile jsonb;next_tile jsonb;recent jsonb;
begin
 if actor is null then raise exception 'Not authorized' using errcode='42501';end if;
 if jsonb_typeof(p_patch)<>'object' or exists(select 1 from jsonb_object_keys(p_patch) k where k not in('mirrored','isVisible','status','shareNowPlaying'))
 or (p_patch ? 'status' and (jsonb_typeof(p_patch->'status')<>'string' or length(p_patch->>'status')>200))
 or exists(select 1 from jsonb_each(p_patch) e where e.key in('mirrored','isVisible','shareNowPlaying') and jsonb_typeof(e.value)<>'boolean') then raise exception 'Invalid tile' using errcode='22023';end if;
 select personal_tile into current_tile from public.profiles where id=actor for update;
 if p_patch ? 'status' and (p_patch->>'status') is distinct from (current_tile->>'status') then
  insert into public.profile_status_events(user_id,text) values(actor,p_patch->>'status');
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('text',text,'createdAt',created_at) order by created_at desc,id desc),'[]') into recent from(select * from public.profile_status_events where user_id=actor order by created_at desc,id desc limit 20) e;
 next_tile:=current_tile||p_patch||jsonb_build_object('history',recent);
 update public.profiles set personal_tile=next_tile where id=actor;
 return next_tile;
end;$$;
create function public.read_tile_history(p_cursor text default null,p_limit integer default 20) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare c jsonb:=case when p_cursor is null then null else p_cursor::jsonb end;items jsonb;last_item jsonb;
begin
 if auth.uid() is null then raise exception 'Not authorized' using errcode='42501';end if;
 if p_limit not between 1 and 100 then raise exception 'Invalid limit' using errcode='22023';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'text',text,'createdAt',created_at) order by created_at desc,id desc),'[]') into items
 from(select * from public.profile_status_events where user_id=auth.uid() and(c is null or(created_at,id)<((c->>'at')::timestamptz,(c->>'id')::uuid)) order by created_at desc,id desc limit p_limit) e;
 last_item:=items->-1;
 return jsonb_build_object('items',items,'nextCursor',case when jsonb_array_length(items)=p_limit then jsonb_build_object('at',last_item->>'createdAt','id',last_item->>'id')::text else null end);
end;$$;
create function public.read_character_history() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Not authorized' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('slug',slug,'totalSeconds',seconds,'sessionCount',n) order by seconds desc,slug),'[]') into result from(
  select c.slug,sum(s.actual_seconds) seconds,count(*) n from public.sessions s cross join lateral jsonb_array_elements_text(s.companions->'characterSlugs') c(slug)
  where s.user_id=auth.uid() and s.ended_at is not null group by c.slug
 ) history;
 return result;
end;$$;
revoke all on function public.update_personal_tile(jsonb),public.read_tile_history(text,integer),public.read_character_history() from public,anon;
grant execute on function public.update_personal_tile(jsonb),public.read_tile_history(text,integer),public.read_character_history() to authenticated;
