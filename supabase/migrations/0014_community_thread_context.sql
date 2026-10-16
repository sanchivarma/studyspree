alter function public.community_read(text,jsonb) rename to community_read_base;
create function public.community_read(p_area text,p_query jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();resource uuid:=(p_query->>'id')::uuid;selected_group uuid:=(p_query->>'groupId')::uuid;result jsonb;items jsonb;page_offset integer:=coalesce((p_query->>'cursor')::integer,0);
begin
 if actor is null then raise exception 'Not authorized' using errcode='42501';end if;
 if p_area='feed' and resource is not null and auth_private.can_read_post(resource,actor) then
  select group_id into selected_group from public.feed_posts where id=resource;
  p_query:=p_query||jsonb_build_object('groupId',selected_group);
 end if;
 if p_area='schedule' and selected_group is not null then
  if not auth_private.group_member(selected_group,actor) then raise exception 'Group unavailable' using errcode='42501';end if;
  if page_offset not between 0 and 100000 then raise exception 'Invalid page' using errcode='22023';end if;
  select coalesce(jsonb_agg(item),'[]') into items from(select auth_private.community_item(e.id,e.title,'',e.created_at,e.creator_id,jsonb_build_object('startsAt',e.starts_at,'minutes',e.minutes,'capacity',e.capacity,'roomId',e.room_id,'cancelled',e.is_cancelled,'bookings',(select count(*) from public.session_bookings where event_id=e.id),'booked',exists(select 1 from public.session_bookings where event_id=e.id and user_id=actor))) item from public.scheduled_sessions e join public.study_rooms r on r.id=e.room_id where r.group_id=selected_group and auth_private.can_read_room(r.id,actor) and(not e.is_cancelled or e.creator_id=actor) and e.starts_at>=coalesce((p_query->>'from')::timestamptz,now()-interval '1 day') and e.starts_at<coalesce((p_query->>'to')::timestamptz,now()+interval '90 days') order by e.starts_at,e.id limit 20 offset page_offset) entries;
  return jsonb_build_object('items',items,'resource',null,'context','{}'::jsonb,'viewerId',actor,'available',true,'nextCursor',case when jsonb_array_length(items)=20 then(page_offset+20)::text else null end);
 end if;
 result:=public.community_read_base(p_area,p_query);
 if p_area='awards' then
  select coalesce(jsonb_agg(jsonb_set(item,'{id}',to_jsonb(md5((item->>'id')||':'||(item->>'title'))::uuid))),'[]') into items from jsonb_array_elements(result->'items') item;
  result:=jsonb_set(result,'{items}',items);
 end if;
 return result;
end;$$;
revoke all on function public.community_read_base(text,jsonb) from public,anon,authenticated;
revoke all on function public.community_read(text,jsonb) from public,anon;
grant execute on function public.community_read(text,jsonb) to authenticated;

create function public.moderate_room(p_room uuid,p_target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null or not exists(select 1 from public.room_members where room_id=p_room and user_id=actor and role in('owner','moderator')) or not exists(select 1 from public.room_members where room_id=p_room and user_id=p_target and role='member') then raise exception 'Not authorized' using errcode='42501';end if;
 update public.room_visits set left_at=now(),sharing_video=false where room_id=p_room and user_id=p_target and left_at is null;
 delete from public.room_members where room_id=p_room and user_id=p_target and role='member';
 return jsonb_build_object('id',p_room);
end;$$;
revoke all on function public.moderate_room(uuid,uuid) from public,anon;
grant execute on function public.moderate_room(uuid,uuid) to authenticated;
