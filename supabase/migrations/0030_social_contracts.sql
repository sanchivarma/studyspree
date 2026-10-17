alter table public.study_rooms add column visibility text not null default 'public' check(visibility in('public','unlisted','private'));
update public.study_rooms set visibility='private' where is_private;
alter table public.room_invites add column revoked_at timestamptz;
create table public.group_invitations (
 id uuid primary key default gen_random_uuid(), group_id uuid not null references public.study_groups(id) on delete cascade,
 created_by uuid not null references public.profiles(id), token_hash text not null unique,
 expires_at timestamptz not null, revoked_at timestamptz
);
alter table public.group_invitations enable row level security;
revoke all on public.group_invitations from public,anon,authenticated;
grant select on public.group_invitations to authenticated;
create policy group_invites_manager on public.group_invitations for select to authenticated using(auth_private.group_manager(group_id,auth.uid()));
alter table public.buddy_listings add column category text not null default 'other' check(category in('student','professional','other'));
alter table public.buddy_listings add column timezone text not null default 'UTC';
alter table public.buddy_listings add column availability text not null default '' check(length(availability)<=500);
update public.buddy_listings b set timezone=p.timezone from public.profiles p where p.id=b.owner_id;
create index buddy_discovery_order on public.buddy_listings(category,created_at desc,id desc) where is_published;
alter table public.thread_members add column last_read_message_id uuid references public.chat_messages(id);
alter table public.study_tasks add column position integer not null default 0;
alter table public.feed_posts add column visibility text not null default 'public' check(visibility in('public','followers','private','group'));
update public.feed_posts set visibility='group' where group_id is not null;
create or replace function auth_private.can_read_post(p uuid,actor uuid) returns boolean language sql stable security definer set search_path='' as $$
 select actor is not null and exists(select 1 from public.feed_posts where id=p and not is_deleted and not auth_private.is_blocked(author_id,actor)
 and(group_id is null or auth_private.group_member(group_id,actor))
 and(author_id=actor or visibility in('public','group') or(visibility='followers' and exists(select 1 from public.profile_follows where follower_id=actor and following_id=author_id)))
 and(parent_id is null or auth_private.can_read_post(parent_id,actor)));
$$;

alter function public.community_mutate(text,jsonb) rename to community_mutate_v29;
revoke all on function public.community_mutate_v29(text,jsonb) from public,anon,authenticated;
create function public.community_mutate(p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); resource uuid:=(p_data->>'id')::uuid;result jsonb;token text;inv public.group_invitations;room uuid;vis text;gid uuid;
begin
 if actor is null then raise exception 'Not authorized' using errcode='42501';end if;
 case p_action
 when 'group.invite' then
  if not auth_private.group_manager(resource,actor) then raise exception 'Not authorized' using errcode='42501';end if;
  token:=encode(extensions.gen_random_bytes(32),'hex');
  insert into public.group_invitations(group_id,created_by,token_hash,expires_at) values(resource,actor,encode(extensions.digest(token,'sha256'),'hex'),now()+interval '7 days');
  return jsonb_build_object('id',resource,'token',token);
 when 'group.invite.revoke' then
  update public.group_invitations set revoked_at=now() where id=resource and auth_private.group_manager(group_id,actor) returning group_id into gid;
  if not found then raise exception 'Not authorized' using errcode='42501';end if;
  return jsonb_build_object('id',gid);
 when 'room.invite.revoke' then
  update public.room_invites set revoked_at=now() where id=resource and exists(select 1 from public.room_members where room_id=room_invites.room_id and user_id=actor and role in('owner','moderator')) returning room_id into room;
  if not found then raise exception 'Not authorized' using errcode='42501';end if;
  return jsonb_build_object('id',room);
 when 'invite.accept' then
  select * into inv from public.group_invitations where token_hash=encode(extensions.digest(p_data->>'token','sha256'),'hex') for update;
  if found then
   if inv.revoked_at is not null or inv.expires_at<=now() then raise exception 'Invitation unavailable' using errcode='42501';end if;
   insert into public.group_members(group_id,user_id,accepted) values(inv.group_id,actor,true) on conflict(group_id,user_id) do update set accepted=true;
   return jsonb_build_object('id',inv.group_id,'kind','group');
  end if;
  result:=public.community_mutate('room.accept',p_data);return result||jsonb_build_object('kind','room');
 when 'room.accept' then
  if exists(select 1 from public.room_invites where token_hash=encode(extensions.digest(p_data->>'token','sha256'),'hex') and revoked_at is not null) then raise exception 'Invitation unavailable' using errcode='42501';end if;
 when 'message.read' then
  if not auth_private.can_read_thread(resource,actor) or not exists(select 1 from public.chat_messages where id=(p_data->>'messageId')::uuid and thread_id=resource) then raise exception 'Not authorized' using errcode='42501';end if;
  insert into public.thread_members(thread_id,user_id,last_read_message_id) values(resource,actor,(p_data->>'messageId')::uuid)
  on conflict(thread_id,user_id) do update set last_read_message_id=excluded.last_read_message_id;
  return jsonb_build_object('id',resource);
 when 'task.edit' then
  if (p_data->>'position')::integer<0 or length(btrim(p_data->>'title')) not between 1 and 300 then raise exception 'Invalid task' using errcode='22023';end if;
  update public.study_tasks set title=btrim(p_data->>'title'),due_date=(p_data->>'date')::date,position=(p_data->>'position')::integer where id=resource and user_id=actor;
  if not found then raise exception 'Not authorized' using errcode='42501';end if;
  return jsonb_build_object('id',resource);
 when 'buddy.save' then
  if coalesce(p_data->>'category','other') not in('student','professional','other') or length(coalesce(p_data->>'availability',''))>500 or not exists(select 1 from pg_timezone_names where name=coalesce(p_data->>'timezone',(select timezone from public.profiles where id=actor))) then raise exception 'Invalid listing' using errcode='22023';end if;
 when 'room.create' then
  vis:=coalesce(p_data->>'visibility',case when (p_data->>'private')::boolean then 'private' else 'public' end);
  if vis not in('public','unlisted','private') then raise exception 'Invalid visibility' using errcode='22023';end if;
  p_data:=p_data||jsonb_build_object('private',vis<>'public');
 when 'post.create' then
  vis:=coalesce(p_data->>'visibility',case when p_data->>'groupId' is not null then 'group' else 'public' end);
  if p_data->>'parentId' is not null then select visibility into vis from public.feed_posts where id=(p_data->>'parentId')::uuid;end if;
  if vis not in('public','followers','private','group') or(vis='group' and p_data->>'groupId' is null) then raise exception 'Invalid visibility' using errcode='22023';end if;
 else null;
 end case;
 result:=public.community_mutate_v29(p_action,p_data);
 if p_action='room.create' then update public.study_rooms set visibility=vis where id=(result->>'id')::uuid;
 elsif p_action='buddy.save' then update public.buddy_listings set category=coalesce(p_data->>'category',category),timezone=coalesce(p_data->>'timezone',timezone),availability=coalesce(p_data->>'availability',availability) where id=(result->>'id')::uuid;
 elsif p_action='post.create' then update public.feed_posts set visibility=vis where id=(result->>'id')::uuid;
 end if;
 return result;
end;$$;
revoke all on function public.community_mutate(text,jsonb) from public,anon;
grant execute on function public.community_mutate(text,jsonb) to authenticated;

-- Last-read data and invitation inventories are private; tokens are never returned from storage.
alter function public.community_read(text,jsonb) rename to community_read_v29;
revoke all on function public.community_read_v29(text,jsonb) from public,anon,authenticated;
create function public.community_read(p_area text,p_query jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();resource uuid:=(p_query->>'id')::uuid;result jsonb;items jsonb;
begin
 if actor is null then raise exception 'Not authorized' using errcode='42501';end if;
 if p_area='invitations' then
  if p_query->>'filter'='group' then
   if not auth_private.group_manager(resource,actor) then raise exception 'Not authorized' using errcode='42501';end if;
   select coalesce(jsonb_agg(auth_private.community_item(id,'','',expires_at,created_by,jsonb_build_object('expiresAt',expires_at,'revoked',revoked_at is not null))),'[]') into items from public.group_invitations where group_id=resource;
  else
   if not exists(select 1 from public.room_members where room_id=resource and user_id=actor and role in('owner','moderator')) then raise exception 'Not authorized' using errcode='42501';end if;
   select coalesce(jsonb_agg(auth_private.community_item(id,'','',expires_at,created_by,jsonb_build_object('expiresAt',expires_at,'revoked',revoked_at is not null,'uses',remaining_uses))),'[]') into items from public.room_invites where room_id=resource;
  end if;
  return jsonb_build_object('items',items,'resource',null,'context','{}'::jsonb,'viewerId',actor,'available',true,'nextCursor',null);
 end if;
 result:=public.community_read_v29(p_area,p_query);
 if p_area='messages' and auth_private.can_read_thread(resource,actor) then
  result:=jsonb_set(result,'{context}',(result->'context')||jsonb_build_object('lastReadMessageId',(select last_read_message_id from public.thread_members where thread_id=resource and user_id=actor)));
 end if;
 return result;
end;$$;
revoke all on function public.community_read(text,jsonb) from public,anon;
grant execute on function public.community_read(text,jsonb) to authenticated;
