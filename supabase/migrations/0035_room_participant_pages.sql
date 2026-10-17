create function public.read_room_participants(p_room uuid,p_cursor text default null,p_limit integer default 20) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid();c jsonb:=case when p_cursor is null then null else p_cursor::jsonb end;items jsonb;stamp timestamptz:=coalesce((c->>'snapshotAt')::timestamptz,now());last_item jsonb;
begin
 if actor is null or not auth_private.active_room_member(p_room,actor) or not auth_private.can_read_room(p_room,actor) then raise exception 'Not authorized' using errcode='42501';end if;
 if p_limit not between 1 and 100 or stamp>now() or stamp<now()-interval '1 day' then raise exception 'Invalid page' using errcode='22023';end if;
 select coalesce(jsonb_agg(item order by user_id),'[]') into items from(
  select user_id,auth_private.community_item(user_id,'','',joined_at,user_id,jsonb_build_object('sharing',sharing_video,'status',status_message)) item
  from public.room_visits where room_id=p_room and left_at is null and last_seen_at>now()-interval '90 seconds' and joined_at<=stamp
  and not auth_private.is_blocked(user_id,actor) and(c is null or user_id>(c->>'id')::uuid) order by user_id limit p_limit
 ) roster;
 last_item:=items->-1;
 return jsonb_build_object('items',items,'resource',null,'context',jsonb_build_object('humanCount',(select count(distinct user_id) from public.room_visits where room_id=p_room and left_at is null and last_seen_at>now()-interval '90 seconds' and not auth_private.is_blocked(user_id,actor))),'viewerId',actor,'available',true,
 'nextCursor',case when jsonb_array_length(items)=p_limit then jsonb_build_object('snapshotAt',stamp,'id',last_item->>'id')::text else null end);
end;$$;
revoke all on function public.read_room_participants(uuid,text,integer) from public,anon;
grant execute on function public.read_room_participants(uuid,text,integer) to authenticated;
