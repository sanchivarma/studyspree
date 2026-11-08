-- Saving a room is a personal choice, separate from access and participation.
create table public.saved_study_rooms (
 user_id uuid not null references public.profiles(id) on delete cascade,
 room_id uuid not null references public.study_rooms(id) on delete cascade,
 saved_at timestamptz not null default now(),
 primary key(user_id,room_id)
);
create index saved_study_rooms_room on public.saved_study_rooms(room_id);
alter table public.saved_study_rooms enable row level security;
revoke all on public.saved_study_rooms from public,anon,authenticated;
grant select on public.saved_study_rooms to authenticated;
create policy own_saved_study_rooms on public.saved_study_rooms for select to authenticated
 using(user_id=(select auth.uid()));

create function auth_private.guard_saved_study_room() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.study_rooms where id=new.room_id and room_kind<>'temporary' and not is_system
  and not is_closed and deleted_at is null for share;
 if not found or not auth_private.can_read_room(new.room_id,new.user_id) then
  raise exception 'Room cannot be saved' using errcode='42501';end if;
 return new;
end;$$;
create trigger guard_saved_study_room before insert or update on public.saved_study_rooms
 for each row execute function auth_private.guard_saved_study_room();
revoke all on function auth_private.guard_saved_study_room() from public,anon,authenticated;

insert into public.saved_study_rooms(user_id,room_id)
 select m.user_id,r.id from public.room_members m join public.study_rooms r on r.id=m.room_id
 where r.room_kind<>'temporary' and not r.is_system and not r.is_closed and r.deleted_at is null
  and auth_private.can_read_room(r.id,m.user_id)
 on conflict do nothing;

-- A deleted room disappears from every person's saved list in the same transaction.
create function auth_private.forget_unavailable_saved_room() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.deleted_at is not null or new.is_closed or new.room_kind='temporary' then
  delete from public.saved_study_rooms where room_id=new.id;
 end if;
 return new;
end;$$;
create trigger forget_unavailable_saved_room after update of deleted_at,is_closed,room_kind on public.study_rooms
 for each row execute function auth_private.forget_unavailable_saved_room();
revoke all on function auth_private.forget_unavailable_saved_room() from public,anon,authenticated;

alter function public.community_mutate(text,jsonb) rename to community_mutate_before_personal_saves;
revoke all on function public.community_mutate_before_personal_saves(text,jsonb) from public,anon,authenticated;
create function public.community_mutate(p_action text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result jsonb; room public.study_rooms;
begin
 if actor is null then raise exception 'Not authorized' using errcode='42501';end if;
 if p_action='room.unsave' then
  select * into room from public.study_rooms where id=(p_data->>'id')::uuid for share;
  if room.is_system or room.owner_id=actor then raise exception 'Creator deletion required' using errcode='42501';end if;
  delete from public.saved_study_rooms where user_id=actor and room_id=(p_data->>'id')::uuid;
  return jsonb_build_object('id',p_data->>'id');
 end if;
 result:=public.community_mutate_before_personal_saves(p_action,p_data);
 if p_action in('room.create','room.join','room.accept') or (p_action='invite.accept' and result->>'kind'='room') then
  select * into room from public.study_rooms where id=(result->>'id')::uuid;
  if room.id is not null and room.room_kind<>'temporary' and not room.is_system
   and not room.is_closed and room.deleted_at is null and auth_private.can_read_room(room.id,actor) then
   insert into public.saved_study_rooms(user_id,room_id) values(actor,room.id) on conflict do nothing;
  end if;
 end if;
 return result;
end;$$;
revoke all on function public.community_mutate(text,jsonb) from public,anon;
grant execute on function public.community_mutate(text,jsonb) to authenticated;

alter function public.community_read(text,jsonb) rename to community_read_before_personal_saves;
revoke all on function public.community_read_before_personal_saves(text,jsonb) from public,anon,authenticated;
create function public.community_read(p_area text,p_query jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); items jsonb; general jsonb; last_item jsonb;
 c jsonb:=case when p_query->>'cursor' is null then null else (p_query->>'cursor')::jsonb end;
 stamp timestamptz:=coalesce((c->>'snapshotAt')::timestamptz,now());
 fingerprint text:=md5('personalSavedRoomsV80'||(p_query-'cursor')::text);n integer:=coalesce((p_query->>'limit')::integer,20);
begin
 if p_area<>'savedRooms' then return public.community_read_before_personal_saves(p_area,p_query);end if;
 if actor is null then raise exception 'Not authorized' using errcode='42501';end if;
 if n not between 1 and 100 or stamp>now() or stamp<now()-interval '1 day'
  or(c is not null and c->>'fingerprint' is distinct from fingerprint) then raise exception 'Invalid page' using errcode='22023';end if;
 select auth_private.home_public_room_item(r) into general from public.study_rooms r where r.is_system;
 select coalesce(jsonb_agg(item order by saved_at desc,id desc),'[]') into items from (
  select saved.saved_at,r.id,auth_private.community_item(r.id,r.name,r.description,saved.saved_at,r.owner_id,
   jsonb_build_object('roomKind',r.room_kind,'soloView',r.solo_view,'characterSlugs',r.controls->'characterSlugs',
    'humanCount',(select count(distinct user_id) from public.room_visits where room_id=r.id and left_at is null and last_seen_at>now()-interval '90 seconds'))) item
  from public.saved_study_rooms saved join public.study_rooms r on r.id=saved.room_id
  where saved.user_id=actor and r.room_kind<>'temporary' and not r.is_system and auth_private.can_read_room(r.id,actor)
   and not auth_private.is_blocked(r.owner_id,actor) and saved.saved_at<=stamp and auth_private.community_page_after(c,0,saved.saved_at,r.id)
  order by saved.saved_at desc,r.id desc limit n
 ) listing;
 last_item:=items->-1;
 return jsonb_build_object('items',items,'resource',null,'context',jsonb_build_object('defaultRoom',general),'viewerId',actor,'available',true,
  'nextCursor',case when jsonb_array_length(items)=n then jsonb_build_object('snapshotAt',stamp,'at',last_item->>'createdAt','score',0,'id',last_item->>'id','fingerprint',fingerprint)::text else null end);
end;$$;
revoke all on function public.community_read(text,jsonb) from public,anon;
grant execute on function public.community_read(text,jsonb) to authenticated;

update public.study_rooms set name='StudySpree General Study Room I',description=
 'Open 24/7 · Real people · no virtual partners. Room audio and microphones are always off here. Study together, protect and respect each other''s privacy. Camera sharing is preferred when joining. Never record, screenshot or redistribute anyone''s camera. Keep personal details private and use respectful, study-related chat.'
 where is_system;
