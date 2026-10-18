-- Persistent public rooms do not require a running laptop or a fake host user.
alter table public.study_rooms alter column owner_id drop not null;
alter table public.study_rooms add column is_system boolean not null default false;
alter table public.study_rooms add constraint room_owner_or_system check(owner_id is not null or is_system);
create unique index one_default_study_room on public.study_rooms((is_system)) where is_system;
alter table public.study_rooms add column controls jsonb not null default '{"themeSlug":"rain-desk","characterSlugs":[],"audio":{"musicTrack":null,"musicVolume":0,"roomVolume":0,"backgroundEffects":[],"effectVolumes":{}}}';

create function auth_private.valid_room_controls(value jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare audio jsonb:=value->'audio';effects jsonb:=audio->'backgroundEffects';characters jsonb:=value->'characterSlugs';
begin
 if jsonb_typeof(value)<>'object' or not(value ?& array['themeSlug','characterSlugs','audio']) or (select count(*) from jsonb_object_keys(value))<>3 or value->>'themeSlug' not in('rain-desk','night-shift','balcony-dusk','dorm-bunk','nature-day','nature-night','sci-fi','space') then return false;end if;
 if not public.valid_companion_selection(jsonb_build_object('mode',case when jsonb_array_length(characters)=0 then 'people' else 'mixed' end,'characterSlugs',characters)) then return false;end if;
 if jsonb_typeof(audio)<>'object' or (select count(*) from jsonb_object_keys(audio))<>5 or not(audio ?& array['musicTrack','musicVolume','roomVolume','backgroundEffects','effectVolumes']) then return false;end if;
 if audio->'musicTrack'<>'null'::jsonb and (jsonb_typeof(audio->'musicTrack')<>'string' or not(audio->>'musicTrack' in('still-water','silent') or audio->>'musicTrack' ~ '^radio:[a-z0-9-]{1,80}$')) then return false;end if;
 if jsonb_typeof(audio->'musicVolume')<>'number' or jsonb_typeof(audio->'roomVolume')<>'number' or (audio->>'musicVolume')::numeric not between 0 and 1 or (audio->>'roomVolume')::numeric not between 0 and 1 then return false;end if;
 if jsonb_typeof(effects)<>'array' or not(effects <@ '["cafe","wind","rain","thunderstorm","brown-noise","white-noise","medieval-warrior","medieval-walk","medieval-knight","ocean","library","castle"]'::jsonb) or jsonb_array_length(effects)<>(select count(distinct entry) from jsonb_array_elements(effects) entry) then return false;end if;
 return coalesce(public.valid_effect_volumes(audio->'effectVolumes'),false);
exception when others then return false;
end;$$;
revoke all on function auth_private.valid_room_controls(jsonb) from public,anon,authenticated;
alter table public.study_rooms add constraint valid_shared_room_controls check(auth_private.valid_room_controls(controls));
update public.study_rooms r set controls=jsonb_build_object('themeSlug',s.theme_slug,'characterSlugs',s.companions->'characterSlugs','audio',r.controls->'audio') from public.sessions s where s.id=r.source_session_id;
update public.study_rooms set capacity=60 where visibility='public' and capacity>60;

create function auth_private.room_limits() returns trigger language plpgsql set search_path='' as $$
begin
 if new.visibility='public' then new.capacity:=least(new.capacity,60);end if;
 if new.is_system and (new.owner_id is not null or new.is_closed or new.is_private or new.visibility<>'public' or new.source_session_id is not null or new.capacity<>60 or new.controls->'characterSlugs'<>'[]'::jsonb or new.controls->'audio'<>'{"musicTrack":null,"musicVolume":0,"roomVolume":0,"backgroundEffects":[],"effectVolumes":{}}'::jsonb) then raise exception 'Default room remains people-only and silent' using errcode='23514';end if;
 return new;
end;$$;
create trigger enforce_room_limits before insert or update on public.study_rooms for each row execute function auth_private.room_limits();
insert into public.study_rooms(id,owner_id,name,description,capacity,is_private,visibility,is_system)
values('00000000-0000-4000-8000-000000000060',null,'StudySpree Default Study','Always open. Real people, quiet studying. Microphones and room audio stay off. Camera sharing is optional and requires a separate opt-in. Do not record, screenshot or redistribute another person''s video. Keep personal information private. Be respectful; use chat for study-related requests.',60,false,'public',true);

alter function public.community_mutate(text,jsonb) rename to community_mutate_v59;
revoke all on function public.community_mutate_v59(text,jsonb) from public,anon,authenticated;
create function public.community_mutate(p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();room public.study_rooms;controls jsonb;
begin
 if actor is null then raise exception 'Not authorized' using errcode='42501';end if;
 if p_action in('room.controls','room.update','room.invite','room.invite.revoke') then
  if p_action='room.invite.revoke' then select r.* into room from public.study_rooms r join public.room_invites i on i.room_id=r.id where i.id=(p_data->>'id')::uuid for update of r;
  else select * into room from public.study_rooms where id=(p_data->>'id')::uuid for update;end if;
  if room.id is null or room.owner_id is distinct from actor or room.is_system then raise exception 'Creator controls required' using errcode='42501';end if;
 end if;
 if p_action='room.controls' then
  controls:=p_data->'controls';
  if not coalesce(auth_private.valid_room_controls(controls),false) then raise exception 'Invalid controls' using errcode='22023';end if;
  update public.study_rooms set controls=p_data->'controls' where id=room.id;
  return jsonb_build_object('id',room.id);
 end if;
 return public.community_mutate_v59(p_action,p_data);
end;$$;
revoke all on function public.community_mutate(text,jsonb) from public,anon;
grant execute on function public.community_mutate(text,jsonb) to authenticated;

alter function public.community_read(text,jsonb) rename to community_read_v59;
revoke all on function public.community_read_v59(text,jsonb) from public,anon,authenticated;
create function public.community_read(p_area text,p_query jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;room public.study_rooms;default_room jsonb;
begin
 result:=public.community_read_v59(p_area,p_query);
 if p_area='publicSessions' then
  select auth_private.community_item(r.id,r.name,r.description,r.created_at,null,jsonb_build_object('system',true,'capacity',r.capacity,'audioLocked',true,'humanCount',(select count(distinct user_id) from public.room_visits where room_id=r.id and left_at is null and last_seen_at>now()-interval '90 seconds'))) into default_room from public.study_rooms r where r.is_system and auth_private.can_read_room(r.id,auth.uid());
  result:=jsonb_set(result,'{context}',coalesce(result->'context','{}')||jsonb_build_object('defaultRoom',default_room));
 elsif p_area='room' then
  select * into room from public.study_rooms where id=(p_query->>'id')::uuid;
  result:=jsonb_set(result,'{context}',coalesce(result->'context','{}')||jsonb_build_object('creatorId',room.owner_id,'isCreator',room.owner_id=auth.uid(),'system',room.is_system,'audioLocked',room.is_system,'controls',room.controls));
 end if;
 return result;
end;$$;
revoke all on function public.community_read(text,jsonb) from public,anon;
grant execute on function public.community_read(text,jsonb) to authenticated;

create function auth_private.guard_people_only_session() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.study_rooms where id=coalesce(new.room_id,new.shared_room_id) and is_system) and new.companions->'characterSlugs'<>'[]'::jsonb then raise exception 'Default room is people-only' using errcode='23514';end if;
 return new;
end;$$;
create trigger default_room_people_only before insert or update of room_id,shared_room_id,companions on public.sessions for each row execute function auth_private.guard_people_only_session();
