create function public.community_dashboard() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid();active_room uuid;latest_room uuid;rooms jsonb;latest jsonb;people jsonb;
begin
 if actor is null then raise exception 'Not authorized' using errcode='42501';end if;
 select room_id into latest_room from public.room_visits where user_id=actor order by joined_at desc,id desc limit 1;
 select room_id into active_room from public.room_visits where user_id=actor and left_at is null and last_seen_at>now()-interval '90 seconds' and auth_private.can_read_room(room_id,actor) limit 1;
 select coalesce(jsonb_agg(item),'[]') into rooms from(select jsonb_build_object('id',r.id,'name',r.name,'description',r.description,
  'humanCount',(select count(*) from public.room_visits where room_id=r.id and left_at is null and last_seen_at>now()-interval '90 seconds'),
  'access',case when r.group_id is not null then 'members' when r.is_private then 'invite' else 'public' end,'canJoin',true) item from public.study_rooms r where auth_private.can_read_room(r.id,actor) and not exists(select 1 from public.scheduled_sessions where room_id=r.id) order by r.created_at desc,r.id desc limit 20) entries;
 select jsonb_build_object('id',r.id,'name',r.name,'description',r.description,
  'humanCount',(select count(*) from public.room_visits where room_id=r.id and left_at is null and last_seen_at>now()-interval '90 seconds'),
  'access',case when r.group_id is not null then 'members' when r.is_private then 'invite' else 'public' end,'canJoin',true) into latest from public.study_rooms r where r.id=latest_room and auth_private.can_read_room(r.id,actor) and not exists(select 1 from public.scheduled_sessions where room_id=r.id);
 -- Names are returned for the viewer's active room, matching the join notice.
 -- The dashboard never exposes a global list of private users' presence.
 select coalesce(jsonb_agg(jsonb_build_object('id',v.user_id,'displayName',auth_private.person(v.user_id)->>'displayName','avatarUrl',null)),'[]') into people from public.room_visits v where v.room_id=active_room and v.user_id<>actor and v.left_at is null and v.last_seen_at>now()-interval '90 seconds' and not auth_private.is_blocked(actor,v.user_id);
 return jsonb_build_object('latestRoom',latest,'activeRoomId',active_room,'rooms',rooms,'onlinePeople',people,'capabilities',jsonb_build_object('humanRooms',true));
end;$$;
revoke all on function public.community_dashboard() from public,anon;
grant execute on function public.community_dashboard() to authenticated;
