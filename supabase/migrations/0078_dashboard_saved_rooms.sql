-- Room identity survives individual study sessions and deletion. History stays intact.
alter table public.study_rooms
  add column room_kind text not null default 'permanent-shared'
    check(room_kind in ('temporary','permanent-solo','permanent-shared')),
  add column solo_view jsonb not null default '{"desk":"modern","window":"sea"}',
  add column deleted_at timestamptz;
update public.study_rooms set room_kind='temporary' where source_session_id is not null;
alter table public.study_rooms add constraint saved_solo_is_private
  check(room_kind<>'permanent-solo' or (is_private and visibility='private' and not is_system));
alter table public.study_rooms add constraint deleted_room_is_closed check(deleted_at is null or (is_closed and not is_system));
create function auth_private.valid_saved_solo_view(value jsonb) returns boolean
language sql immutable set search_path='' as $$
 select coalesce(jsonb_typeof(value)='object' and value ?& array['desk','window']
  and value-'desk'-'window'='{}'::jsonb
  and value->>'desk' in('none','modern','medieval','shakespearean','pirate','kings','student','scientist','submarine','space-shuttle')
  and value->>'window' in('old-castle','castle-garden','sailing-ships','sea','mountains','space','underwater','magic-academy','waterfall'),false);
$$;
revoke all on function auth_private.valid_saved_solo_view(jsonb) from public,anon,authenticated;
alter table public.study_rooms add constraint valid_saved_solo_view check(auth_private.valid_saved_solo_view(solo_view));
create index saved_rooms_owner on public.study_rooms(owner_id,created_at desc,id desc)
  where deleted_at is null and room_kind<>'temporary';
alter table public.sessions add column saved_room_id uuid references public.study_rooms(id);

create or replace function auth_private.can_read_room(r uuid,actor uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select actor is not null and exists(select 1 from public.study_rooms where id=r and not is_closed and deleted_at is null
 and(room_kind<>'permanent-solo' or owner_id=actor)
 and(source_session_id is null or exists(select 1 from public.sessions where id=source_session_id and ended_at is null))
 and(group_id is null or auth_private.group_member(group_id,actor))
 and(not is_private or owner_id=actor or exists(select 1 from public.room_members where room_id=r and user_id=actor)));
$$;

alter function public.community_mutate(text,jsonb) rename to community_mutate_before_saved_rooms;
revoke all on function public.community_mutate_before_saved_rooms(text,jsonb) from public,anon,authenticated;
create function public.community_mutate(p_action text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); room public.study_rooms; result jsonb; kind text; view jsonb;
begin
 if actor is null then raise exception 'Not authorized' using errcode='42501';end if;
 if p_action='room.create' and p_data ? 'roomKind' then
  kind:=p_data->>'roomKind';view:=coalesce(p_data->'soloView','{"desk":"modern","window":"sea"}');
  if kind not in('temporary','permanent-solo','permanent-shared') or not auth_private.valid_saved_solo_view(view)
    or not coalesce(auth_private.valid_room_controls(p_data->'controls'),false)
    or length(btrim(p_data->>'title')) not between 1 and 100 or length(coalesce(p_data->>'body',''))>1000
    or (p_data->>'capacity')::integer not between 1 and 60 then
   raise exception 'Invalid room' using errcode='22023';
  end if;
  if kind<>'permanent-solo' then perform auth_private.require_feature(actor,'shared-room-access');end if;
  insert into public.study_rooms(owner_id,name,description,category,is_private,visibility,capacity,room_kind,controls,solo_view)
    values(actor,btrim(p_data->>'title'),coalesce(p_data->>'body',''),'deep',kind='permanent-solo',
      case when kind='permanent-solo' then 'private' else 'unlisted' end,
      case when kind='permanent-solo' then 1 else (p_data->>'capacity')::integer end,kind,p_data->'controls',view)
    returning * into room;
  insert into public.room_members(room_id,user_id,role) values(room.id,actor,'owner');
  return jsonb_build_object('id',room.id);
 end if;
 if p_action='room.delete' then
  select * into room from public.study_rooms where id=(p_data->>'id')::uuid for update;
  if room.id is null or room.owner_id is distinct from actor or room.is_system then
   raise exception 'Creator controls required' using errcode='42501';end if;
  -- Existing sessions keep their timestamps and banked history. Shared presence is revoked.
  update public.study_rooms set deleted_at=coalesce(deleted_at,now()),is_closed=true where id=room.id;
  update public.room_visits set left_at=now(),sharing_video=false where room_id=room.id and left_at is null;
  return jsonb_build_object('id',room.id);
 end if;
 if p_action like 'room.%' and p_data ? 'id' then
  select * into room from public.study_rooms where id=(p_data->>'id')::uuid;
  if room.deleted_at is not null then raise exception 'Room deleted' using errcode='42501';end if;
  if p_action='room.join' and room.room_kind='permanent-solo' then raise exception 'Private solo room' using errcode='42501';end if;
 end if;
 return public.community_mutate_before_saved_rooms(p_action,p_data);
end;$$;
revoke all on function public.community_mutate(text,jsonb) from public,anon;
grant execute on function public.community_mutate(text,jsonb) to authenticated;

alter function public.community_read(text,jsonb) rename to community_read_before_saved_rooms;
revoke all on function public.community_read_before_saved_rooms(text,jsonb) from public,anon,authenticated;
create function public.community_read(p_area text,p_query jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result jsonb; room public.study_rooms; items jsonb; general jsonb; last_item jsonb;
 c jsonb:=case when p_query->>'cursor' is null then null else (p_query->>'cursor')::jsonb end;
 stamp timestamptz:=coalesce((c->>'snapshotAt')::timestamptz,now());
 fingerprint text:=md5('savedRoomsV78'||(p_query-'cursor')::text);n integer:=coalesce((p_query->>'limit')::integer,20);
begin
 if actor is null then raise exception 'Not authorized' using errcode='42501';end if;
 if p_area='savedRooms' then
  if n not between 1 and 100 or stamp>now() or stamp<now()-interval '1 day'
    or(c is not null and c->>'fingerprint' is distinct from fingerprint) then raise exception 'Invalid page' using errcode='22023';end if;
  select auth_private.home_public_room_item(r) into general from public.study_rooms r where r.is_system;
  select coalesce(jsonb_agg(item order by created_at desc,id desc),'[]') into items from (
   select r.created_at,r.id,auth_private.home_public_room_item(r)||jsonb_build_object('data',
     (auth_private.home_public_room_item(r)->'data')||jsonb_build_object('roomKind',r.room_kind,'soloView',r.solo_view)) item
   from public.study_rooms r where not r.is_system and r.room_kind<>'temporary' and auth_private.can_read_room(r.id,actor)
    and (r.owner_id=actor or r.visibility='public' or exists(select 1 from public.room_members where room_id=r.id and user_id=actor))
    and not auth_private.is_blocked(r.owner_id,actor) and r.created_at<=stamp and auth_private.community_page_after(c,0,r.created_at,r.id)
   order by r.created_at desc,r.id desc limit n
  ) listing;
  last_item:=items->-1;
  return jsonb_build_object('items',items,'resource',null,'context',jsonb_build_object('defaultRoom',general),'viewerId',actor,'available',true,
   'nextCursor',case when jsonb_array_length(items)=n then jsonb_build_object('snapshotAt',stamp,'at',last_item->>'createdAt','score',0,'id',last_item->>'id','fingerprint',fingerprint)::text else null end);
 end if;
 if p_area='room' then
  select * into room from public.study_rooms where id=(p_query->>'id')::uuid;
  if room.deleted_at is not null then
   return jsonb_build_object('items','[]'::jsonb,'resource',null,'context',jsonb_build_object('deleted',true),'viewerId',actor,'available',true,'nextCursor',null);
  end if;
  if room.room_kind='permanent-solo' then
   if not auth_private.can_read_room(room.id,actor) then raise exception 'Not authorized' using errcode='42501';end if;
   return jsonb_build_object('items','[]'::jsonb,'resource',auth_private.home_public_room_item(room),
    'context',jsonb_build_object('roomKind',room.room_kind,'soloView',room.solo_view,'controls',room.controls),'viewerId',actor,'available',true,'nextCursor',null);
  end if;
 end if;
 result:=public.community_read_before_saved_rooms(p_area,p_query);
 if p_area='room' then result:=jsonb_set(result,'{context}',(result->'context')||jsonb_build_object('roomKind',room.room_kind));end if;
 return result;
end;$$;
revoke all on function public.community_read(text,jsonb) from public,anon;
grant execute on function public.community_read(text,jsonb) to authenticated;

create function public.start_saved_solo_room(p_room uuid) returns public.sessions
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); room public.study_rooms; result public.sessions;
begin
 if actor is null then raise exception 'Not authorized' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
 select * into room from public.study_rooms where id=p_room for update;
 if room.owner_id is distinct from actor or room.room_kind<>'permanent-solo' or not auth_private.can_read_room(p_room,actor) then
  raise exception 'Not authorized' using errcode='42501';end if;
 select * into result from public.sessions where user_id=actor and ended_at is null;
 if found then return result;end if;
 update public.profiles set solo_scene=room.solo_view,selected_theme=room.controls->>'themeSlug' where id=actor;
 select * into result from public.start_session_with_details(null,room.controls->>'themeSlug',null,'{"mode":"solo","characterSlugs":[]}',room.name,null,'private');
 update public.sessions set saved_room_id=room.id where id=result.id returning * into result;
 return result;
end;$$;
revoke all on function public.start_saved_solo_room(uuid) from public,anon;
grant execute on function public.start_saved_solo_room(uuid) to authenticated;

-- Save per-room scenery changes during its active Solo session, including Settings changes.
create function auth_private.remember_solo_room_view() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 update public.study_rooms r set solo_view=new.solo_scene,controls=jsonb_set(r.controls,'{themeSlug}',to_jsonb(new.selected_theme))
 from public.sessions s where s.user_id=new.id and s.ended_at is null and s.saved_room_id=r.id
  and r.owner_id=new.id and r.room_kind='permanent-solo' and r.deleted_at is null;
 return new;
end;$$;
create trigger remember_solo_room_view after update of solo_scene,selected_theme on public.profiles
 for each row execute function auth_private.remember_solo_room_view();

create function auth_private.temporary_room_lifetime() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' and new.room_id is not null then
  update public.study_rooms set source_session_id=new.id where id=new.room_id and owner_id=new.user_id
   and room_kind='temporary' and source_session_id is null;
 elsif tg_op='UPDATE' and old.ended_at is null and new.ended_at is not null then
  update public.study_rooms set is_closed=true where source_session_id=new.id and room_kind='temporary' and not is_system;
  update public.room_visits v set left_at=now(),sharing_video=false from public.study_rooms r
   where v.room_id=r.id and r.source_session_id=new.id and r.room_kind='temporary' and v.left_at is null;
 elsif tg_op='UPDATE' and new.room_id is not null and old.room_id is distinct from new.room_id then
  update public.study_rooms set source_session_id=new.id where id=new.room_id and owner_id=new.user_id
   and room_kind='temporary' and source_session_id is null;
 end if;
 return new;
end;$$;
create trigger temporary_room_lifetime after insert or update on public.sessions
 for each row execute function auth_private.temporary_room_lifetime();
revoke all on function auth_private.remember_solo_room_view(),auth_private.temporary_room_lifetime() from public,anon,authenticated;
