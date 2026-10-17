alter table public.sessions add column room_id uuid references public.study_rooms(id);
create function public.start_room_session(p_minutes integer,p_theme text,p_task text,p_companions jsonb,p_room uuid) returns public.sessions
language plpgsql security definer set search_path='' as $$
declare session public.sessions;
begin
 if auth.uid() is null or not auth_private.active_room_member(p_room,auth.uid()) or not auth_private.can_read_room(p_room,auth.uid()) then raise exception 'Not authorized' using errcode='42501';end if;
 perform auth_private.require_feature(auth.uid(),'shared-room-access');
 select * into session from public.start_study_session(p_minutes,p_theme,p_task,p_companions);
 update public.sessions set room_id=p_room where id=session.id and ended_at is null returning * into session;
 return session;
end;$$;
revoke all on function public.start_room_session(integer,text,text,jsonb,uuid) from public,anon;
grant execute on function public.start_room_session(integer,text,text,jsonb,uuid) to authenticated;
-- The prior opaque-cursor scheme is retained; extended private history needs its feature grant.
alter function public.community_read(text,jsonb) rename to community_read_v37;
revoke all on function public.community_read_v37(text,jsonb) from public,anon,authenticated;
create function public.community_read(p_area text,p_query jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if p_area='partners' and p_query->>'cursor' is not null then perform auth_private.require_feature(auth.uid(),'extended-partner-history');end if;
 if p_area='messages' and exists(select 1 from public.conversation_threads where id=(p_query->>'id')::uuid and kind='group') then perform auth_private.require_feature(auth.uid(),'group-chat');end if;
 return public.community_read_v37(p_area,p_query);
end;$$;
revoke all on function public.community_read(text,jsonb) from public,anon;
grant execute on function public.community_read(text,jsonb) to authenticated;
