-- Reuse the one protected, permanent room; never create a fake host account.
update public.study_rooms set name='StudySpree General Study Room' where is_system;

-- A newly published session carries its explicitly chosen virtual partners
-- into the shared room. Subsequent creator controls remain authoritative.
create function auth_private.initialize_public_room_controls() returns trigger
language plpgsql security definer set search_path='' as $$
declare source public.sessions;
begin
  if new.source_session_id is not null and not new.is_system then
    select * into source from public.sessions where id=new.source_session_id;
    if found then
      new.controls:=jsonb_build_object('themeSlug',source.theme_slug,'characterSlugs',source.companions->'characterSlugs','audio',new.controls->'audio');
    end if;
  end if;
  return new;
end; $$;
revoke all on function auth_private.initialize_public_room_controls() from public,anon,authenticated;
create trigger initialize_public_room_controls before insert on public.study_rooms
for each row execute function auth_private.initialize_public_room_controls();

create function auth_private.home_public_room_item(room public.study_rooms) returns jsonb
language sql stable security definer set search_path='' as $$
  select auth_private.community_item(room.id,room.name,coalesce(room.session_rules,room.description,''),room.created_at,room.owner_id,
    jsonb_build_object('sessionId',room.source_session_id,'system',room.is_system,'capacity',room.capacity,'audioLocked',room.is_system,
      'characterSlugs',room.controls->'characterSlugs',
      'humanCount',(select count(distinct user_id) from public.room_visits where room_id=room.id and left_at is null and last_seen_at>now()-interval '90 seconds')));
$$;
revoke all on function auth_private.home_public_room_item(public.study_rooms) from public,anon,authenticated;

alter function public.community_read(text,jsonb) rename to community_read_before_home_tiles;
revoke all on function public.community_read_before_home_tiles(text,jsonb) from public,anon,authenticated;
create function public.community_read(p_area text,p_query jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare items jsonb; general jsonb; c jsonb:=case when p_query->>'cursor' is null then null else (p_query->>'cursor')::jsonb end;
  stamp timestamptz:=coalesce((c->>'snapshotAt')::timestamptz,now()); fingerprint text:=md5('homePublicSessionsV72'||(p_query-'cursor')::text);
  n integer:=coalesce((p_query->>'limit')::integer,20); last_item jsonb;
begin
  if p_area<>'publicSessions' then return public.community_read_before_home_tiles(p_area,p_query); end if;
  if auth.uid() is null then raise exception 'Not authorized' using errcode='42501'; end if;
  if n not between 1 and 100 or stamp>now() or stamp<now()-interval '1 day' or(c is not null and c->>'fingerprint' is distinct from fingerprint) then
    raise exception 'Invalid page' using errcode='22023';
  end if;
  select auth_private.home_public_room_item(r) into general from public.study_rooms r
    where r.is_system and auth_private.can_read_room(r.id,auth.uid());
  select coalesce(jsonb_agg(item order by created_at desc,id desc),'[]') into items from (
    select r.created_at,r.id,auth_private.home_public_room_item(r) item
    from public.study_rooms r join public.sessions s on s.id=r.source_session_id
    where not r.is_system and s.visibility='public' and s.ended_at is null
      and s.companions->>'mode'<>'solo' and s.last_heartbeat_at>now()-interval '90 seconds'
      and r.visibility='public' and not r.is_private and auth_private.can_read_room(r.id,auth.uid())
      and not auth_private.is_blocked(r.owner_id,auth.uid())
      and r.created_at<=stamp and auth_private.community_page_after(c,0,r.created_at,r.id)
    order by r.created_at desc,r.id desc limit n
  ) listing;
  last_item:=items->-1;
  return jsonb_build_object('items',items,'resource',null,'context',jsonb_build_object('defaultRoom',general),'viewerId',auth.uid(),'available',true,
    'nextCursor',case when jsonb_array_length(items)=n then jsonb_build_object('snapshotAt',stamp,'at',last_item->>'createdAt','score',0,'id',last_item->>'id','fingerprint',fingerprint)::text else null end);
end; $$;
revoke all on function public.community_read(text,jsonb) from public,anon;
grant execute on function public.community_read(text,jsonb) to authenticated;
