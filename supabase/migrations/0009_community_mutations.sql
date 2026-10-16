alter table public.profiles add column allow_direct_messages boolean not null default false;
create function auth_private.person(actor uuid) returns jsonb language sql stable security definer set search_path='' as $$
select jsonb_build_object('id',p.id,'username',p.username,'displayName',coalesce(nullif(p.display_name,''),p.username),
  'avatarPath',case when c.is_public then c.avatar_path else null end)
from public.profiles p join public.profile_cards c on c.user_id=p.id where p.id=actor and not auth_private.is_blocked(actor,auth.uid());$$;

create function auth_private.room_usage(actor uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare zone text; day_start timestamptz; day_end timestamptz; used bigint; policy public.plan_policies;
begin
 select timezone into zone from public.profiles where id=actor;
 day_start:=((now() at time zone zone)::date)::timestamp at time zone zone;
 day_end:=(((now() at time zone zone)::date+1)::timestamp at time zone zone);
 select p.* into policy from public.plan_policies p where p.plan=coalesce((select e.plan from public.account_entitlements e where e.user_id=actor and (e.expires_at is null or e.expires_at>now())),'free');
 select coalesce(sum(extract(epoch from upper(span)-lower(span))),0)::bigint into used from (
   select unnest(range_agg(tstzrange(greatest(joined_at,day_start),least(case when left_at is null and last_seen_at>now()-interval '90 seconds' then now() else coalesce(left_at,last_seen_at) end,day_end),'[)'))) span
   from public.room_visits where user_id=actor and joined_at<day_end and (case when left_at is null and last_seen_at>now()-interval '90 seconds' then now() else coalesce(left_at,last_seen_at) end)>greatest(joined_at,day_start)
 ) merged;
 return jsonb_build_object('usedSeconds',used,'dailyLimitSeconds',policy.daily_room_seconds,
   'remainingSeconds',case when policy.daily_room_seconds is null then null else greatest(0,policy.daily_room_seconds-used) end,
   'maxPins',policy.max_pins,'partnerRows',policy.partner_rows,'resetsAt',day_end);
end;$$;

create function public.community_mutate(p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); resource uuid:=(p_data->>'id')::uuid; target uuid:=(p_data->>'targetId')::uuid;
 result_id uuid; selected_group uuid:=(p_data->>'groupId')::uuid; room public.study_rooms; grp public.study_groups;
 event public.scheduled_sessions; thread public.conversation_threads; message public.chat_messages; post public.feed_posts;
 invitation public.room_invites; policy jsonb; token text; valid boolean; n integer; member uuid; recipient uuid;
begin
 if actor is null then raise exception 'Not authorized' using errcode='42501'; end if;
 if jsonb_typeof(p_data)<>'object' then raise exception 'Invalid input' using errcode='22023'; end if;
 case p_action
 when 'task.create' then
  insert into public.study_tasks(user_id,title,due_date) values(actor,trim(p_data->>'title'),(p_data->>'date')::date) returning id into result_id;
 when 'task.update' then
  update public.study_tasks set is_done=(p_data->>'done')::boolean where id=resource and user_id=actor returning id into result_id;
 when 'task.delete' then delete from public.study_tasks where id=resource and user_id=actor returning id into result_id;
 when 'notification.read' then update public.app_notifications set is_read=true where user_id=actor and (resource is null or id=resource); result_id:=actor;
 when 'feedback.create' then insert into public.app_feedback(user_id,kind,body) values(actor,p_data->>'kind',trim(p_data->>'body')) returning id into result_id;
 when 'preferences' then
  update public.profiles set allow_direct_messages=coalesce((p_data->>'allowMessages')::boolean,allow_direct_messages),leaderboard_opt_in=coalesce((p_data->>'leaderboardOptIn')::boolean,leaderboard_opt_in) where id=actor;result_id:=actor;
 when 'block.set' then
  if target=actor then raise exception 'Invalid target' using errcode='22023';end if;
  if (p_data->>'value')::boolean then insert into public.user_blocks(blocker_id,blocked_id) values(actor,target) on conflict do nothing;
  else delete from public.user_blocks where blocker_id=actor and blocked_id=target;end if;result_id:=actor;
 when 'report.create' then insert into public.community_reports(reporter_id,target_kind,target_id,reason) values(actor,p_data->>'kind',target,trim(p_data->>'reason')) returning id into result_id;
 when 'group.create' then
  insert into public.study_groups(owner_id,name,description,is_private) values(actor,trim(p_data->>'title'),coalesce(p_data->>'body',''),coalesce((p_data->>'private')::boolean,false)) returning id into result_id;
  insert into public.group_members(group_id,user_id,role,accepted) values(result_id,actor,'owner',true);
  insert into public.conversation_threads(owner_id,group_id,kind,title) values(actor,result_id,'channel',p_data->>'title');
 when 'group.update' then
  update public.study_groups set name=trim(p_data->>'title'),description=p_data->>'body' where id=resource and owner_id=actor returning id into result_id;
 when 'group.join' then
  select * into grp from public.study_groups where id=resource;
  if not found then raise exception 'Group unavailable' using errcode='42501';end if;
  insert into public.group_members(group_id,user_id,accepted) values(resource,actor,not grp.is_private) on conflict do nothing;result_id:=resource;
 when 'group.approve' then
  if not auth_private.group_manager(resource,actor) then raise exception 'Not authorized' using errcode='42501';end if;
  update public.group_members set accepted=true where group_id=resource and user_id=target;
  insert into public.app_notifications(user_id,actor_id,kind,resource_id) values(target,actor,'membership',resource);result_id:=resource;
 when 'group.role' then
  if not exists(select 1 from public.study_groups where id=resource and owner_id=actor) or target=actor or p_data->>'role' not in ('member','moderator') then raise exception 'Not authorized' using errcode='42501';end if;
  update public.group_members set role=p_data->>'role' where group_id=resource and user_id=target and accepted;result_id:=resource;
 when 'group.remove' then
  if not auth_private.group_manager(resource,actor) then raise exception 'Not authorized' using errcode='42501';end if;
  delete from public.group_members where group_id=resource and user_id=target and role='member';result_id:=resource;
 when 'group.transfer' then
  select * into grp from public.study_groups where id=resource for update;
  if grp.owner_id is distinct from actor or target=actor or not auth_private.group_member(resource,target) then raise exception 'Not authorized' using errcode='42501';end if;
  update public.group_members set role='member' where group_id=resource and user_id=actor;
  update public.group_members set role='owner' where group_id=resource and user_id=target;
  update public.study_groups set owner_id=target where id=resource;result_id:=resource;
 when 'group.leave' then
  if exists(select 1 from public.study_groups where id=resource and owner_id=actor) then raise exception 'Transfer ownership first' using errcode='22023';end if;
  delete from public.group_members where group_id=resource and user_id=actor;result_id:=resource;
 when 'room.create' then
  if selected_group is not null and not auth_private.group_member(selected_group,actor) then raise exception 'Not authorized' using errcode='42501';end if;
  insert into public.study_rooms(owner_id,group_id,name,description,category,is_private,capacity) values(actor,selected_group,trim(p_data->>'title'),coalesce(p_data->>'body',''),p_data->>'category',coalesce((p_data->>'private')::boolean,false),(p_data->>'capacity')::integer) returning id into result_id;
  insert into public.room_members(room_id,user_id,role) values(result_id,actor,'owner');
 when 'room.update' then
  select * into room from public.study_rooms where id=resource for update;
  if room.owner_id is distinct from actor then raise exception 'Not authorized' using errcode='42501';end if;
  if (p_data->>'capacity')::integer<(select count(*) from public.room_visits where room_id=resource and left_at is null and last_seen_at>now()-interval '90 seconds') then raise exception 'Capacity is in use' using errcode='23514';end if;
  update public.study_rooms set name=trim(p_data->>'title'),description=coalesce(p_data->>'body',''),capacity=(p_data->>'capacity')::integer where id=resource;result_id:=resource;
 when 'room.join' then
  perform pg_advisory_xact_lock(hashtextextended(actor::text,1));
  select * into room from public.study_rooms where id=resource for update;
  if not auth_private.can_read_room(resource,actor) then raise exception 'Room unavailable' using errcode='42501';end if;
  if exists(select 1 from public.scheduled_sessions e where e.room_id=resource and (e.is_cancelled or now()<e.starts_at or now()>=e.starts_at+make_interval(mins=>e.minutes) or not exists(select 1 from public.session_bookings b where b.event_id=e.id and b.user_id=actor))) then raise exception 'Booking not active' using errcode='42501';end if;
  if exists(select 1 from public.room_visits where user_id=actor and room_id=resource and left_at is null and last_seen_at>now()-interval '90 seconds') then return jsonb_build_object('id',resource);end if;
  policy:=auth_private.room_usage(actor);
  if (policy->>'remainingSeconds')::bigint<=0 then raise exception 'Daily room allowance reached' using errcode='P0001';end if;
  update public.room_visits set left_at=greatest(joined_at,last_seen_at),sharing_video=false where left_at is null and (user_id=actor or(room_id=resource and last_seen_at<=now()-interval '90 seconds'));
  if (select count(*) from public.room_visits where room_id=resource and left_at is null)>=room.capacity then raise exception 'Room is full' using errcode='P0001';end if;
  insert into public.room_visits(room_id,user_id) values(resource,actor);
  insert into public.room_members(room_id,user_id) values(resource,actor) on conflict do nothing;result_id:=resource;
 when 'room.heartbeat' then
  policy:=auth_private.room_usage(actor);
  if (policy->>'remainingSeconds')::bigint<=0 then update public.room_visits set left_at=now(),sharing_video=false where room_id=resource and user_id=actor and left_at is null;
  else update public.room_visits set last_seen_at=now() where room_id=resource and user_id=actor and left_at is null;end if;result_id:=resource;
 when 'room.leave' then update public.room_visits set left_at=now(),sharing_video=false where room_id=resource and user_id=actor and left_at is null;result_id:=resource;
 when 'room.share' then
  update public.room_visits set sharing_video=(p_data->>'value')::boolean where room_id=resource and user_id=actor and left_at is null and last_seen_at>now()-interval '90 seconds' returning id into result_id;
 when 'room.status' then update public.room_visits set status_message=p_data->>'body' where room_id=resource and user_id=actor and left_at is null returning id into result_id;
 when 'room.pin' then
  if not auth_private.active_room_member(resource,actor) or not auth_private.active_room_member(resource,target) then raise exception 'Not authorized' using errcode='42501';end if;
  policy:=auth_private.room_usage(actor);
  if (p_data->>'value')::boolean then
   if not exists(select 1 from public.room_pins where user_id=actor and room_id=resource and target_id=target) and (select count(*) from public.room_pins where user_id=actor and room_id=resource)>=coalesce((policy->>'maxPins')::integer,2147483647) then raise exception 'Pin allowance reached' using errcode='P0001';end if;
   insert into public.room_pins(user_id,room_id,target_id,reason) values(actor,resource,target,coalesce(p_data->>'reason','')) on conflict(user_id,room_id,target_id) do update set reason=excluded.reason;
  else delete from public.room_pins where user_id=actor and room_id=resource and target_id=target;end if;result_id:=resource;
 when 'room.invite' then
  if not exists(select 1 from public.room_members where room_id=resource and user_id=actor and role in ('owner','moderator')) then raise exception 'Not authorized' using errcode='42501';end if;
  n:=(p_data->>'uses')::integer;if n not between 1 and 1000 or (p_data->>'hours')::integer not between 1 and 168 then raise exception 'Invalid invitation' using errcode='22023';end if;
  token:=encode(extensions.gen_random_bytes(32),'hex');
  insert into public.room_invites(room_id,created_by,token_hash,expires_at,remaining_uses) values(resource,actor,encode(extensions.digest(token,'sha256'),'hex'),now()+make_interval(hours=>(p_data->>'hours')::integer),n);
  return jsonb_build_object('id',resource,'token',token);
 when 'room.accept' then
  select * into invitation from public.room_invites where token_hash=encode(extensions.digest(p_data->>'token','sha256'),'hex') for update;
  if not found or invitation.expires_at<=now() or invitation.remaining_uses<=0 then raise exception 'Invitation unavailable' using errcode='42501';end if;
  insert into public.room_members(room_id,user_id) values(invitation.room_id,actor) on conflict do nothing;
  if found then update public.room_invites set remaining_uses=remaining_uses-1 where id=invitation.id;end if;result_id:=invitation.room_id;
 when 'partner.set' then
  if target=actor or auth_private.is_blocked(actor,target) or not exists(select 1 from public.room_visits a join public.room_visits b on a.room_id=b.room_id and a.user_id=actor and b.user_id=target and a.joined_at<coalesce(b.left_at,b.last_seen_at) and b.joined_at<coalesce(a.left_at,a.last_seen_at)) then raise exception 'Partner unavailable' using errcode='42501';end if;
  insert into public.partner_preferences(user_id,partner_id,is_favorite,notify) values(actor,target,(p_data->>'favorite')::boolean,(p_data->>'notify')::boolean) on conflict(user_id,partner_id) do update set is_favorite=excluded.is_favorite,notify=excluded.notify;result_id:=target;
 when 'buddy.save' then
  insert into public.buddy_listings(owner_id,title,body,subjects,is_published) values(actor,trim(p_data->>'title'),trim(p_data->>'body'),array(select jsonb_array_elements_text(p_data->'subjects')),coalesce((p_data->>'published')::boolean,true))
  on conflict(owner_id) do update set title=excluded.title,body=excluded.body,subjects=excluded.subjects,is_published=excluded.is_published,updated_at=now() returning id into result_id;
 when 'buddy.remove' then update public.buddy_listings set is_published=false where owner_id=actor returning id into result_id;
 when 'thread.direct' then
  if target=actor or auth_private.is_blocked(actor,target) or not exists(select 1 from public.profiles where id=target and (allow_direct_messages or exists(select 1 from public.buddy_listings where owner_id=target and is_published))) then raise exception 'Messaging unavailable' using errcode='42501';end if;
  perform pg_advisory_xact_lock(hashtextextended(least(actor,target)::text||greatest(actor,target)::text,2));
  select t.id into result_id from public.conversation_threads t where t.kind='direct' and exists(select 1 from public.thread_members where thread_id=t.id and user_id=actor) and exists(select 1 from public.thread_members where thread_id=t.id and user_id=target) limit 1;
  if result_id is null then insert into public.conversation_threads(owner_id,kind,title) values(actor,'direct','Conversation') returning id into result_id;insert into public.thread_members(thread_id,user_id) values(result_id,actor),(result_id,target);end if;
 when 'thread.create' then
  if jsonb_array_length(p_data->'members') not between 1 and 49 then raise exception 'Invalid members' using errcode='22023';end if;
  for member in select value::text::uuid from jsonb_array_elements_text(p_data->'members') loop
   if member=actor or auth_private.is_blocked(actor,member) or not exists(select 1 from public.profiles where id=member and allow_direct_messages) then raise exception 'Messaging unavailable' using errcode='42501';end if;
  end loop;
  insert into public.conversation_threads(owner_id,kind,title) values(actor,'group',trim(p_data->>'title')) returning id into result_id;
  insert into public.thread_members(thread_id,user_id) values(result_id,actor);
  insert into public.thread_members(thread_id,user_id) select result_id,value::uuid from jsonb_array_elements_text(p_data->'members') on conflict do nothing;
 when 'thread.leave' then delete from public.thread_members where thread_id=resource and user_id=actor;result_id:=resource;
 when 'message.send' then
  select * into thread from public.conversation_threads where id=resource;
  if not auth_private.can_read_thread(resource,actor) or(thread.read_only and not auth_private.community_admin(actor) and not auth_private.group_manager(thread.group_id,actor)) then raise exception 'Not authorized' using errcode='42501';end if;
  if exists(select 1 from public.thread_members where thread_id=resource and auth_private.is_blocked(user_id,actor)) then raise exception 'Messaging unavailable' using errcode='42501';end if;
  if (p_data->>'parentId') is not null and not exists(select 1 from public.chat_messages where id=(p_data->>'parentId')::uuid and thread_id=resource) then raise exception 'Invalid reply' using errcode='22023';end if;
  insert into public.chat_messages(thread_id,author_id,parent_id,client_id,body) values(resource,actor,(p_data->>'parentId')::uuid,(p_data->>'clientId')::uuid,trim(p_data->>'body')) on conflict(author_id,client_id) do nothing returning id into result_id;
  if result_id is not null then insert into public.app_notifications(user_id,actor_id,kind,resource_id) select user_id,actor,'message',resource from public.thread_members where thread_id=resource and user_id<>actor and not auth_private.is_blocked(user_id,actor);end if;
  if result_id is null then select id into result_id from public.chat_messages where author_id=actor and client_id=(p_data->>'clientId')::uuid;end if;
 when 'message.edit' then
  update public.chat_messages set body=trim(p_data->>'body'),edited_at=now() where id=resource and author_id=actor and not is_deleted and auth_private.can_read_thread(thread_id,actor) returning id into result_id;
 when 'message.remove' then
  update public.chat_messages m set is_deleted=true,body='[removed]',edited_at=now() where id=resource and (author_id=actor or exists(select 1 from public.conversation_threads t where t.id=m.thread_id and (t.owner_id=actor or auth_private.group_manager(t.group_id,actor)))) returning id into result_id;
 when 'message.save' then
  select * into message from public.chat_messages where id=resource;
  if not auth_private.can_read_thread(message.thread_id,actor) then raise exception 'Not authorized' using errcode='42501';end if;
  if (p_data->>'value')::boolean then insert into public.saved_messages(user_id,message_id) values(actor,resource) on conflict do nothing;else delete from public.saved_messages where user_id=actor and message_id=resource;end if;result_id:=resource;
 when 'post.create' then
  if selected_group is not null and not auth_private.group_member(selected_group,actor) then raise exception 'Not authorized' using errcode='42501';end if;
  if (p_data->>'parentId') is not null then
   select * into post from public.feed_posts where id=(p_data->>'parentId')::uuid;
   if not auth_private.can_read_post(post.id,actor) or post.group_id is distinct from selected_group then raise exception 'Not authorized' using errcode='42501';end if;
  end if;
  insert into public.feed_posts(author_id,group_id,parent_id,body,attachments) values(actor,selected_group,(p_data->>'parentId')::uuid,trim(p_data->>'body'),coalesce(p_data->'attachments','[]')) returning id into result_id;
 when 'post.edit' then update public.feed_posts set body=trim(p_data->>'body'),edited_at=now() where id=resource and author_id=actor and not is_deleted returning id into result_id;
 when 'post.remove' then update public.feed_posts set is_deleted=true where id=resource and (author_id=actor or auth_private.group_manager(group_id,actor)) returning id into result_id;
 when 'post.react' then
  if not auth_private.can_read_post(resource,actor) then raise exception 'Not authorized' using errcode='42501';end if;
  if (p_data->>'emoji') is null then delete from public.post_reactions where user_id=actor and post_id=resource;
  else insert into public.post_reactions(user_id,post_id,emoji) values(actor,resource,p_data->>'emoji') on conflict(user_id,post_id) do update set emoji=excluded.emoji;end if;result_id:=resource;
 when 'post.save' then
  if not auth_private.can_read_post(resource,actor) then raise exception 'Not authorized' using errcode='42501';end if;
  if (p_data->>'value')::boolean then insert into public.saved_posts(user_id,post_id) values(actor,resource) on conflict do nothing;else delete from public.saved_posts where user_id=actor and post_id=resource;end if;result_id:=resource;
 when 'event.create' then
  if selected_group is not null and not auth_private.group_member(selected_group,actor) then raise exception 'Not authorized' using errcode='42501';end if;
  if (p_data->>'startsAt')::timestamptz<=now() then raise exception 'Choose a future time' using errcode='22023';end if;
  insert into public.study_rooms(owner_id,group_id,name,capacity) values(actor,selected_group,trim(p_data->>'title'),(p_data->>'capacity')::integer) returning id into result_id;
  insert into public.room_members(room_id,user_id,role) values(result_id,actor,'owner');
  insert into public.scheduled_sessions(creator_id,room_id,title,starts_at,minutes,capacity) values(actor,result_id,trim(p_data->>'title'),(p_data->>'startsAt')::timestamptz,(p_data->>'minutes')::integer,(p_data->>'capacity')::integer) returning id into result_id;
  insert into public.session_bookings(event_id,user_id) values(result_id,actor);
 when 'event.book' then
  select * into event from public.scheduled_sessions where id=resource for update;
  if not found or event.is_cancelled or event.starts_at<=now() or not auth_private.can_read_room(event.room_id,actor) then raise exception 'Session unavailable' using errcode='42501';end if;
  if exists(select 1 from public.session_bookings where event_id=resource and user_id=actor) then return jsonb_build_object('id',resource);end if;
  if(select count(*) from public.session_bookings where event_id=resource)>=event.capacity then raise exception 'Session is full' using errcode='P0001';end if;
  insert into public.session_bookings(event_id,user_id) values(resource,actor);
  insert into public.app_notifications(user_id,actor_id,kind,resource_id) values(event.creator_id,actor,'booking',resource);result_id:=resource;
 when 'event.unbook' then
  if exists(select 1 from public.scheduled_sessions where id=resource and creator_id=actor) then raise exception 'Cancel the session to release the host booking' using errcode='22023';end if;
  delete from public.session_bookings where event_id=resource and user_id=actor;result_id:=resource;
 when 'event.cancel' then
  update public.scheduled_sessions set is_cancelled=true where id=resource and creator_id=actor and not is_cancelled returning room_id into target;
  if found then update public.study_rooms set is_closed=true where id=target;insert into public.app_notifications(user_id,actor_id,kind,resource_id) select user_id,actor,'cancelled',resource from public.session_bookings where event_id=resource and user_id<>actor;end if;result_id:=resource;
 else raise exception 'Unknown action' using errcode='22023';
 end case;
 if result_id is null then raise exception 'Record unavailable' using errcode='42501';end if;
 return jsonb_build_object('id',result_id);
end;$$;
revoke all on function public.community_mutate(text,jsonb) from public,anon;
grant execute on function public.community_mutate(text,jsonb) to authenticated;
revoke all on function auth_private.person(uuid),auth_private.room_usage(uuid) from public,anon;
