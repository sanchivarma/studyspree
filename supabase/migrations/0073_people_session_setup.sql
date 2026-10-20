-- People can start alone and invite others later. Private rooms require an
-- invitation; public rooms keep the existing discoverable joining URL.
alter function public.start_session_with_details(integer,text,text,jsonb,text,text,text,uuid) rename to start_session_before_people_setup;
revoke all on function public.start_session_before_people_setup(integer,text,text,jsonb,text,text,text,uuid) from public,anon,authenticated;
create function public.start_session_with_details(p_minutes integer,p_theme text,p_task text,p_companions jsonb,p_title text,p_rules text,p_visibility text,p_room uuid default null)
returns public.sessions language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result public.sessions; room uuid;
begin
  if actor is null then raise exception 'Not authorized' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
  select * into result from public.sessions where user_id=actor and ended_at is null for update;
  if found and p_room is null then return result; end if;
  if p_room is null and p_companions->>'mode'='people' then perform auth_private.require_feature(actor,'shared-room-access'); end if;
  select * into result from public.start_session_before_people_setup(p_minutes,p_theme,p_task,p_companions,p_title,p_rules,p_visibility,p_room);
  if p_room is null and p_companions->>'mode'='people' and p_visibility='private' and result.room_id is null then
    insert into public.study_rooms(owner_id,name,description,is_private,visibility,capacity,source_session_id,session_rules)
      values(actor,result.title,left(coalesce(result.rules,''),1000),true,'private',60,result.id,result.rules) returning id into room;
    insert into public.room_members(room_id,user_id,role) values(room,actor,'owner');
    perform public.join_room_with_goal(room,p_task);
    update public.sessions set room_id=room,shared_room_id=room where id=result.id returning * into result;
  end if;
  return result;
end; $$;
revoke all on function public.start_session_with_details(integer,text,text,jsonb,text,text,text,uuid) from public,anon;
grant execute on function public.start_session_with_details(integer,text,text,jsonb,text,text,text,uuid) to authenticated;
