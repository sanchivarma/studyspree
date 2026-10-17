alter table public.sessions add column title text not null default 'Study session' check(length(btrim(title)) between 1 and 100);
alter table public.sessions add column rules text check(length(rules)<=2000);
alter table public.sessions add column visibility text not null default 'private' check(visibility in('public','private'));
alter table public.study_rooms add column source_session_id uuid unique references public.sessions(id);
alter table public.study_rooms add column session_rules text check(length(session_rules)<=2000);
create or replace function auth_private.can_read_room(r uuid,actor uuid) returns boolean language sql stable security definer set search_path='' as $$
 select actor is not null and exists(select 1 from public.study_rooms where id=r and not is_closed
 and(source_session_id is null or exists(select 1 from public.sessions where id=source_session_id and ended_at is null))
 and(group_id is null or auth_private.group_member(group_id,actor))
 and(not is_private or owner_id=actor or exists(select 1 from public.room_members where room_id=r and user_id=actor)));
$$;
create function public.start_session_with_details(p_minutes integer,p_theme text,p_task text,p_companions jsonb,p_title text,p_rules text,p_visibility text,p_room uuid default null) returns public.sessions language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();session public.sessions;room uuid;
begin
 if actor is null then raise exception 'Not authorized' using errcode='42501';end if;
 if p_visibility not in('public','private') or length(btrim(p_title)) not between 1 and 100 or length(p_rules)>2000 then raise exception 'Invalid session details' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
 select * into session from public.sessions where user_id=actor and ended_at is null;
 if found then return session;end if;
 if p_room is not null then
  select * into session from public.start_room_session(p_minutes,p_theme,p_task,p_companions,p_room);
 else
  if p_visibility='public' then perform auth_private.require_feature(actor,'shared-room-access');end if;
  select * into session from public.start_study_session(p_minutes,p_theme,p_task,p_companions);
 end if;
 update public.sessions set title=btrim(p_title),rules=nullif(btrim(p_rules),''),visibility=p_visibility where id=session.id returning * into session;
 if p_visibility='public' and p_room is null then
  insert into public.study_rooms(owner_id,name,description,is_private,visibility,capacity,source_session_id,session_rules)
  values(actor,btrim(p_title),left(coalesce(p_rules,''),1000),false,'public',100,session.id,nullif(btrim(p_rules),'')) returning id into room;
  insert into public.room_members(room_id,user_id,role) values(room,actor,'owner');
  perform public.join_room_with_goal(room,p_task);
  update public.sessions set room_id=room,shared_room_id=room where id=session.id returning * into session;
 end if;
 return session;
end;$$;
revoke all on function public.start_session_with_details(integer,text,text,jsonb,text,text,text,uuid) from public,anon;
grant execute on function public.start_session_with_details(integer,text,text,jsonb,text,text,text,uuid) to authenticated;

-- Private sessions become shareable by an explicit copy-invite action, never by listing.
alter function public.calendar_mutate(text,jsonb) rename to calendar_mutate_v39;
revoke all on function public.calendar_mutate_v39(text,jsonb) from public,anon,authenticated;
create function public.calendar_mutate(p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;s public.sessions;
begin
 result:=public.calendar_mutate_v39(p_action,p_data);
 if p_action='session.share' then
  select * into s from public.sessions where id=(p_data->>'id')::uuid and user_id=auth.uid();
  update public.study_rooms set name=s.title,source_session_id=s.id,session_rules=s.rules,description=left(coalesce(s.rules,''),1000) where id=(result->>'id')::uuid;
 end if;
 return result;
end;$$;
revoke all on function public.calendar_mutate(text,jsonb) from public,anon;
grant execute on function public.calendar_mutate(text,jsonb) to authenticated;

alter function public.community_read(text,jsonb) rename to community_read_v39;
revoke all on function public.community_read_v39(text,jsonb) from public,anon,authenticated;
create function public.community_read(p_area text,p_query jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;items jsonb;c jsonb:=case when p_query->>'cursor' is null then null else (p_query->>'cursor')::jsonb end;stamp timestamptz:=coalesce((c->>'snapshotAt')::timestamptz,now());fingerprint text:=md5('publicSessions'||(p_query-'cursor')::text);n integer:=coalesce((p_query->>'limit')::integer,20);last_item jsonb;
begin
 if auth.uid() is null then raise exception 'Not authorized' using errcode='42501';end if;
 if p_area='publicSessions' then
  if n not between 1 and 100 or stamp>now() or stamp<now()-interval '1 day' or(c is not null and c->>'fingerprint' is distinct from fingerprint) then raise exception 'Invalid page' using errcode='22023';end if;
  select coalesce(jsonb_agg(item order by created_at desc,id desc),'[]') into items from(
   select r.created_at,r.id,auth_private.community_item(r.id,r.name,coalesce(r.session_rules,''),r.created_at,r.owner_id,jsonb_build_object('sessionId',r.source_session_id,'humanCount',(select count(distinct user_id) from public.room_visits where room_id=r.id and left_at is null and last_seen_at>now()-interval '90 seconds'))) item
   from public.study_rooms r join public.sessions s on s.id=r.source_session_id
   where s.visibility='public' and s.ended_at is null and s.last_heartbeat_at>now()-interval '90 seconds' and r.visibility='public' and auth_private.can_read_room(r.id,auth.uid()) and not auth_private.is_blocked(r.owner_id,auth.uid())
   and r.created_at<=stamp and auth_private.community_page_after(c,0,r.created_at,r.id)
   order by r.created_at desc,r.id desc limit n
  ) listing;
  last_item:=items->-1;
  return jsonb_build_object('items',items,'resource',null,'context','{}'::jsonb,'viewerId',auth.uid(),'available',true,'nextCursor',case when jsonb_array_length(items)=n then jsonb_build_object('snapshotAt',stamp,'at',last_item->>'createdAt','score',0,'id',last_item->>'id','fingerprint',fingerprint)::text else null end);
 end if;
 result:=public.community_read_v39(p_area,p_query);
 if p_area='room' then result:=jsonb_set(result,'{resource,data}',coalesce(result->'resource'->'data','{}')||jsonb_build_object('rules',(select session_rules from public.study_rooms where id=(p_query->>'id')::uuid)));end if;
 return result;
end;$$;
revoke all on function public.community_read(text,jsonb) from public,anon;
grant execute on function public.community_read(text,jsonb) to authenticated;
