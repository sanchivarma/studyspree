create table public.room_chat_messages (
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null references public.study_rooms(id) on delete cascade,
 author_id uuid not null references public.profiles(id) on delete cascade,
 visit_id uuid references public.room_visits(id),
 kind text not null default 'message' check(kind in('message','goal')),
 body text not null check(length(btrim(body)) between 1 and 1000),
 client_id uuid not null,
 created_at timestamptz not null default now(),
 unique(author_id,client_id)
);
create unique index room_goal_once_per_visit on public.room_chat_messages(visit_id) where kind='goal';
create index room_chat_recent on public.room_chat_messages(room_id,created_at desc,id desc);
create index room_chat_sender_time on public.room_chat_messages(author_id,created_at);
alter table public.room_chat_messages enable row level security;
revoke all on public.room_chat_messages from public,anon,authenticated;
grant select on public.room_chat_messages to authenticated;
create policy room_chat_active_members on public.room_chat_messages for select to authenticated using(
 auth_private.active_room_member(room_id,(select auth.uid()))
 and auth_private.can_read_room(room_id,(select auth.uid()))
 and not auth_private.is_blocked(author_id,(select auth.uid()))
);

create function public.join_room_with_goal(p_room uuid,p_goal text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); visit uuid; goal text:=p_goal;
begin
 if actor is null then raise exception 'Not authorized' using errcode='42501';end if;
 if length(goal)>500 then raise exception 'Invalid goal' using errcode='22023';end if;
 -- Empty string explicitly opts out; null lets existing API clients share the active session goal.
 if goal is null then select task into goal from public.sessions where user_id=actor and ended_at is null order by started_at desc limit 1;end if;
 perform public.community_mutate('room.join',jsonb_build_object('id',p_room));
 select id into visit from public.room_visits where room_id=p_room and user_id=actor and left_at is null;
 if nullif(btrim(goal),'') is not null then
  insert into public.room_chat_messages(room_id,author_id,visit_id,kind,body,client_id)
  values(p_room,actor,visit,'goal',btrim(goal),visit)
  on conflict do nothing;
 end if;
 return jsonb_build_object('id',p_room);
end;$$;

create function public.send_room_chat(p_room uuid,p_body text,p_client_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result_id uuid; existing public.room_chat_messages;
begin
 if actor is null or not auth_private.active_room_member(p_room,actor) or not auth_private.can_read_room(p_room,actor) then raise exception 'Not authorized' using errcode='42501';end if;
 if p_client_id is null or p_body is null or length(btrim(p_body)) not between 1 and 1000 then raise exception 'Invalid message' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,22));
 select * into existing from public.room_chat_messages where author_id=actor and client_id=p_client_id;
 if found then
  if existing.room_id<>p_room or existing.kind<>'message' then raise exception 'Invalid request' using errcode='22023';end if;
  return jsonb_build_object('id',existing.id);
 end if;
 if (select count(*) from public.room_chat_messages where author_id=actor and kind='message' and created_at>now()-interval '1 minute')>=20 then raise exception 'Chat rate limit' using errcode='P0001';end if;
 insert into public.room_chat_messages(room_id,author_id,body,client_id) values(p_room,actor,btrim(p_body),p_client_id) returning id into result_id;
 return jsonb_build_object('id',result_id);
end;$$;

create function public.read_room_chat(p_room uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid();items jsonb;
begin
 if actor is null or not auth_private.active_room_member(p_room,actor) or not auth_private.can_read_room(p_room,actor) then raise exception 'Not authorized' using errcode='42501';end if;
 select coalesce(jsonb_agg(item order by created_at desc,id desc),'[]') into items from (
  select m.id,m.created_at,auth_private.community_item(m.id,'',m.body,m.created_at,m.author_id,jsonb_build_object('kind',m.kind)) item
  from public.room_chat_messages m where m.room_id=p_room and not auth_private.is_blocked(m.author_id,actor)
  order by m.created_at desc,m.id desc limit 100
 ) recent;
 return jsonb_build_object('items',items,'resource',null,'context','{}'::jsonb,'viewerId',actor,'available',true,'nextCursor',null);
end;$$;
revoke all on function public.join_room_with_goal(uuid,text),public.send_room_chat(uuid,text,uuid),public.read_room_chat(uuid) from public,anon;
grant execute on function public.join_room_with_goal(uuid,text),public.send_room_chat(uuid,text,uuid),public.read_room_chat(uuid) to authenticated;
