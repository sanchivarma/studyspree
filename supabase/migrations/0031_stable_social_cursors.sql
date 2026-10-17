-- Cursor helpers are independent of account/session accounting.
alter table public.post_reactions add column created_at timestamptz not null default now();
create function auth_private.popularity_score(post uuid,stamp timestamptz) returns bigint language sql stable security definer set search_path='' as $$
 select count(*) from public.post_reactions where post_id=post and created_at<=stamp;
$$;
create function auth_private.community_page_after(c jsonb,score bigint,stamp timestamptz,item_id uuid,ascending boolean default false) returns boolean language sql immutable set search_path='' as $$
 select c is null or case when ascending then(score,stamp,item_id)>((c->>'score')::bigint,(c->>'at')::timestamptz,(c->>'id')::uuid) else(score,stamp,item_id)<((c->>'score')::bigint,(c->>'at')::timestamptz,(c->>'id')::uuid) end;
$$;
revoke all on function auth_private.community_page_after(jsonb,bigint,timestamptz,uuid,boolean),auth_private.popularity_score(uuid,timestamptz) from public,anon,authenticated;
alter table public.scheduled_sessions add column mode text not null default 'people' check(mode in('people','private-characters'));
alter table public.scheduled_sessions add column character_slugs jsonb not null default '[]';
alter table public.scheduled_sessions add column scheduling_timezone text not null default 'UTC';
update public.scheduled_sessions e set scheduling_timezone=p.timezone from public.profiles p where p.id=e.creator_id;
create or replace function public.community_read_base(p_area text,p_query jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); resource uuid:=(p_query->>'id')::uuid; selected_group uuid:=(p_query->>'groupId')::uuid;
 term text:=coalesce(p_query->>'q',''); selected_filter text:=coalesce(p_query->>'filter','all');
 page_cursor jsonb:=case when p_query->>'cursor' is null then null else (p_query->>'cursor')::jsonb end; page_size integer:=coalesce((p_query->>'limit')::integer,20); page_stamp timestamptz; last_item jsonb; fingerprint text:=md5(p_area||(p_query-'cursor')::text); items jsonb:='[]'; context jsonb:='{}'; detail jsonb:=null;
 room public.study_rooms; grp public.study_groups; thread public.conversation_threads; zone text; today date;
begin
 if actor is null then raise exception 'Not authorized' using errcode='42501';end if;
 if length(term)>100 or page_size not between 1 and 100 then raise exception 'Invalid query' using errcode='22023';end if;
 page_stamp:=coalesce((page_cursor->>'snapshotAt')::timestamptz,now());
 if page_stamp>now() or page_stamp<now()-interval '1 day' or (page_cursor is not null and page_cursor->>'fingerprint' is distinct from fingerprint) then raise exception 'Refresh this list' using errcode='22023';end if;
 select timezone,(now() at time zone timezone)::date into zone,today from public.profiles where id=actor;
 case p_area
 when 'tasks' then
  select coalesce(jsonb_agg(item),'[]') into items from(select auth_private.community_item(id,title,'',created_at,user_id,jsonb_build_object('date',due_date,'done',is_done,'position',position)) item from public.study_tasks where user_id=actor and created_at<=page_stamp and auth_private.community_page_after(page_cursor,-position,created_at,id) and ((p_query->>'date') is null or due_date=(p_query->>'date')::date) and title ilike '%'||term||'%' order by position,created_at desc,id desc limit page_size) entries;
  context:=jsonb_build_object('today',today);
 when 'notifications' then
  select coalesce(jsonb_agg(item),'[]') into items from(select auth_private.community_item(id,kind,'',created_at,actor_id,jsonb_build_object('read',is_read,'resourceId',resource_id)) item from public.app_notifications where user_id=actor and created_at<=page_stamp and auth_private.community_page_after(page_cursor,0,created_at,id) and (actor_id is null or not auth_private.is_blocked(actor,actor_id)) order by created_at desc,id desc limit page_size) entries;
  context:=jsonb_build_object('unread',(select count(*) from public.app_notifications where user_id=actor and not is_read));
 when 'feedback' then
  select coalesce(jsonb_agg(item),'[]') into items from(select auth_private.community_item(id,kind,body,created_at,user_id) item from public.app_feedback where user_id=actor and created_at<=page_stamp and auth_private.community_page_after(page_cursor,0,created_at,id) order by created_at desc,id desc limit page_size) entries;
 when 'groups' then
  select coalesce(jsonb_agg(item),'[]') into items from(select auth_private.community_item(g.id,g.name,g.description,g.created_at,g.owner_id,jsonb_build_object('private',g.is_private,'members',(select count(*) from public.group_members where group_id=g.id and accepted),'joined',auth_private.group_member(g.id,actor))) item from public.study_groups g where auth_private.can_read_group(g.id,actor) and g.created_at<=page_stamp and auth_private.community_page_after(page_cursor,0,g.created_at,g.id) and (g.name||' '||g.description) ilike '%'||term||'%' and (selected_filter<>'mine' or auth_private.group_member(g.id,actor)) order by g.created_at desc,g.id desc limit page_size) entries;
  if resource is not null then
   select * into grp from public.study_groups where id=resource;
   if not auth_private.can_read_group(resource,actor) then raise exception 'Group unavailable' using errcode='42501';end if;
   detail:=auth_private.community_item(grp.id,grp.name,grp.description,grp.created_at,grp.owner_id,jsonb_build_object('private',grp.is_private));
   context:=jsonb_build_object('joined',auth_private.group_member(resource,actor),'manager',auth_private.group_manager(resource,actor),
    'members',case when auth_private.group_member(resource,actor) then coalesce((select jsonb_agg(jsonb_build_object('person',auth_private.person(user_id),'role',role,'accepted',accepted)) from public.group_members where group_id=resource and (accepted or auth_private.group_manager(resource,actor))),'[]') else '[]'::jsonb end,
    'threadId',(select id from public.conversation_threads where group_id=resource and kind='channel' limit 1));
  end if;
 when 'spaces' then
  select coalesce(jsonb_agg(item),'[]') into items from(select auth_private.community_item(r.id,r.name,r.description,r.created_at,r.owner_id,jsonb_build_object('category',r.category,'capacity',r.capacity,'private',r.is_private,'visibility',r.visibility,'online',(select count(*) from public.room_visits where room_id=r.id and left_at is null and last_seen_at>now()-interval '90 seconds'))) item from public.study_rooms r where auth_private.can_read_room(r.id,actor) and r.visibility='public' and r.created_at<=page_stamp and auth_private.community_page_after(page_cursor,0,r.created_at,r.id) and not exists(select 1 from public.scheduled_sessions where room_id=r.id) and(r.name||' '||r.description) ilike '%'||term||'%' and(selected_filter='all' or r.category=selected_filter) order by r.created_at desc,r.id desc limit page_size) entries;
 when 'room' then
  select * into room from public.study_rooms where id=resource;
  if not auth_private.can_read_room(resource,actor) then raise exception 'Room unavailable' using errcode='42501';end if;
  detail:=auth_private.community_item(room.id,room.name,room.description,room.created_at,room.owner_id,jsonb_build_object('category',room.category,'capacity',room.capacity,'private',room.is_private));
  context:=jsonb_build_object('joined',auth_private.active_room_member(resource,actor),'manager',exists(select 1 from public.room_members where room_id=resource and user_id=actor and role in ('owner','moderator')),
    'quota',auth_private.room_usage(actor),
    'pins',coalesce((select jsonb_agg(jsonb_build_object('targetId',target_id,'reason',reason)) from public.room_pins where room_id=resource and user_id=actor),'[]'),
    'people',case when auth_private.active_room_member(resource,actor) then coalesce((select jsonb_agg(jsonb_build_object('person',auth_private.person(user_id),'sharing',sharing_video,'status',status_message,'joinedAt',joined_at)) from public.room_visits where room_id=resource and left_at is null and last_seen_at>now()-interval '90 seconds' and not auth_private.is_blocked(user_id,actor)),'[]') else '[]'::jsonb end);
 when 'buddies' then
  select coalesce(jsonb_agg(item),'[]') into items from(select auth_private.community_item(id,title,body,created_at,owner_id,jsonb_build_object('subjects',subjects,'published',is_published,'category',category,'timezone',timezone,'availability',availability)) item from public.buddy_listings where (is_published or owner_id=actor) and created_at<=page_stamp and auth_private.community_page_after(page_cursor,0,created_at,id) and(selected_filter='all' or category=selected_filter) and not auth_private.is_blocked(owner_id,actor) and(title||' '||body||' '||array_to_string(subjects,' ')) ilike '%'||term||'%' order by created_at desc,id desc limit page_size) entries;
 when 'conversations' then
  select coalesce(jsonb_agg(item),'[]') into items from(select auth_private.community_item(t.id,t.title,'',t.created_at,t.owner_id,jsonb_build_object('kind',t.kind,'readOnly',t.read_only,'groupId',t.group_id)) item from public.conversation_threads t where auth_private.can_read_thread(t.id,actor) and t.created_at<=page_stamp and auth_private.community_page_after(page_cursor,0,t.created_at,t.id) and not(t.kind='direct' and exists(select 1 from public.thread_members where thread_id=t.id and auth_private.is_blocked(user_id,actor))) and t.title ilike '%'||term||'%' order by t.created_at desc,t.id desc limit page_size) entries;
 when 'messages' then
  if selected_filter<>'saved' then
   select * into thread from public.conversation_threads where id=resource;
   if not auth_private.can_read_thread(resource,actor) then raise exception 'Conversation unavailable' using errcode='42501';end if;
   detail:=auth_private.community_item(thread.id,thread.title,'',thread.created_at,thread.owner_id,jsonb_build_object('kind',thread.kind,'readOnly',thread.read_only));
   context:=jsonb_build_object('canPost',not thread.read_only or auth_private.community_admin(actor) or auth_private.group_manager(thread.group_id,actor));
  end if;
  select coalesce(jsonb_agg(item),'[]') into items from(select auth_private.community_item(m.id,'',case when m.is_deleted then '' else m.body end,m.created_at,m.author_id,jsonb_build_object('threadId',m.thread_id,'parentId',m.parent_id,'edited',m.edited_at is not null,'removed',m.is_deleted,'saved',exists(select 1 from public.saved_messages where user_id=actor and message_id=m.id))) item from public.chat_messages m where auth_private.can_read_thread(m.thread_id,actor) and m.created_at<=page_stamp and auth_private.community_page_after(page_cursor,0,m.created_at,m.id) and not auth_private.is_blocked(m.author_id,actor) and(case when selected_filter='saved' then exists(select 1 from public.saved_messages where user_id=actor and message_id=m.id) else m.thread_id=resource end) order by m.created_at desc,m.id desc limit page_size) entries;
 when 'feed' then
  select coalesce(jsonb_agg(item),'[]') into items from(select auth_private.community_item(p.id,'',p.body,p.created_at,p.author_id,jsonb_build_object('groupId',p.group_id,'parentId',p.parent_id,'attachments',p.attachments,'visibility',p.visibility,'popularity',auth_private.popularity_score(p.id,page_stamp),
   'reactions',(select count(*) from public.post_reactions where post_id=p.id),'reaction',(select emoji from public.post_reactions where post_id=p.id and user_id=actor),
   'saved',exists(select 1 from public.saved_posts where user_id=actor and post_id=p.id),'replies',(select count(*) from public.feed_posts where parent_id=p.id and not is_deleted))) item
   from public.feed_posts p where auth_private.can_read_post(p.id,actor) and p.created_at<=page_stamp and auth_private.community_page_after(page_cursor,case when selected_filter='popular' then auth_private.popularity_score(p.id,page_stamp) else 0 end,p.created_at,p.id) and p.parent_id is not distinct from resource and p.group_id is not distinct from selected_group and p.body ilike '%'||term||'%'
   and(selected_filter<>'following' or p.author_id=actor or exists(select 1 from public.profile_follows where follower_id=actor and following_id=p.author_id))
   and(selected_filter<>'saved' or exists(select 1 from public.saved_posts where user_id=actor and post_id=p.id))
   order by case when selected_filter='popular' then auth_private.popularity_score(p.id,page_stamp) else 0 end desc,p.created_at desc,p.id desc limit page_size) entries;
  if resource is not null and auth_private.can_read_post(resource,actor) then select auth_private.community_item(id,'',body,created_at,author_id,jsonb_build_object('groupId',group_id,'attachments',attachments)) into detail from public.feed_posts where id=resource;end if;
 when 'schedule' then
  select coalesce(jsonb_agg(item),'[]') into items from(select auth_private.community_item(e.id,e.title,'',e.created_at,e.creator_id,jsonb_build_object('startsAt',e.starts_at,'minutes',e.minutes,'capacity',e.capacity,'roomId',e.room_id,'cancelled',e.is_cancelled,'mode',e.mode,'characterSlugs',e.character_slugs,'schedulingTimezone',e.scheduling_timezone,'bookings',(select count(*) from public.session_bookings where event_id=e.id),'booked',exists(select 1 from public.session_bookings where event_id=e.id and user_id=actor))) item from public.scheduled_sessions e where (e.creator_id=actor or(e.mode='people' and auth_private.can_read_room(e.room_id,actor))) and (selected_group is null or exists(select 1 from public.study_rooms where id=e.room_id and group_id=selected_group)) and e.created_at<=page_stamp and auth_private.community_page_after(page_cursor,0,e.starts_at,e.id,true) and (not e.is_cancelled or e.creator_id=actor or exists(select 1 from public.session_bookings where event_id=e.id and user_id=actor)) and e.starts_at>=coalesce((p_query->>'from')::timestamptz,now()-interval '1 day') and e.starts_at<coalesce((p_query->>'to')::timestamptz,now()+interval '90 days') order by e.starts_at,e.id limit page_size) entries;
 when 'partners' then
  with overlap_groups as (
   select b.user_id,range_agg(tstzrange(greatest(a.joined_at,b.joined_at),least(coalesce(a.left_at,a.last_seen_at),coalesce(b.left_at,b.last_seen_at),page_stamp),'[)')) spans
   from public.room_visits a join public.room_visits b on a.room_id=b.room_id and b.user_id<>actor
   where a.user_id=actor and greatest(a.joined_at,b.joined_at)<least(coalesce(a.left_at,a.last_seen_at),coalesce(b.left_at,b.last_seen_at),page_stamp) and not auth_private.is_blocked(actor,b.user_id)
   group by b.user_id
  ), segments as(select user_id,unnest(spans) span from overlap_groups), totals as(
   select s.user_id,sum(extract(epoch from upper(span)-lower(span)))::bigint seconds,
    (select count(distinct d.day::date) from segments day_span cross join lateral generate_series((lower(day_span.span) at time zone zone)::date,((upper(day_span.span)-interval '1 microsecond') at time zone zone)::date,interval '1 day') d(day) where day_span.user_id=s.user_id) days from segments s group by s.user_id
  ) select coalesce(jsonb_agg(item),'[]') into items from(select auth_private.community_item(t.user_id,coalesce(auth_private.person(t.user_id)->>'displayName',''),'',now(),t.user_id,
   jsonb_build_object('seconds',t.seconds,'days',t.days,'favorite',coalesce(p.is_favorite,false),'notify',coalesce(p.notify,false))) item from totals t left join public.partner_preferences p on p.partner_id=t.user_id and p.user_id=actor
   where (selected_filter<>'favorites' or p.is_favorite) and auth_private.community_page_after(page_cursor,t.seconds,page_stamp,t.user_id) order by t.seconds desc,t.user_id desc limit least(page_size,coalesce((auth_private.room_usage(actor)->>'partnerRows')::integer,page_size)) ) entries;
 when 'search' then
  select coalesce(jsonb_agg(item),'[]') into items from(select * from(
   select auth_private.community_item(p.id,coalesce(nullif(p.display_name,''),p.username),'',p.created_at,p.id,jsonb_build_object('href','/people/'||p.username,'kind','person')) item,p.created_at from public.profiles p join public.profile_cards c on c.user_id=p.id where c.is_public and not auth_private.is_blocked(p.id,actor) and(p.display_name||' '||p.username) ilike '%'||term||'%'
   union all select auth_private.community_item(r.id,r.name,r.description,r.created_at,r.owner_id,jsonb_build_object('href','/rooms/'||r.id,'kind','room')),r.created_at from public.study_rooms r where auth_private.can_read_room(r.id,actor) and r.name ilike '%'||term||'%'
   union all select auth_private.community_item(g.id,g.name,g.description,g.created_at,g.owner_id,jsonb_build_object('href','/groups/'||g.id,'kind','group')),g.created_at from public.study_groups g where auth_private.can_read_group(g.id,actor) and g.name ilike '%'||term||'%'
   union all select auth_private.community_item(b.id,b.title,b.body,b.created_at,b.owner_id,jsonb_build_object('href','/buddies','kind','buddy')),b.created_at from public.buddy_listings b where b.is_published and not auth_private.is_blocked(b.owner_id,actor) and(b.title||' '||b.body) ilike '%'||term||'%'
  ) entries where created_at<=page_stamp and auth_private.community_page_after(page_cursor,0,created_at,(item->>'id')::uuid) order by created_at desc,(item->>'id')::uuid desc limit page_size) search_page;
 when 'plans' then context:=auth_private.room_usage(actor)||jsonb_build_object('plan',coalesce((select plan from public.account_entitlements where user_id=actor and(expires_at is null or expires_at>now())),'free'));
 when 'preferences' then
  context:=jsonb_build_object('allowMessages',(select allow_direct_messages from public.profiles where id=actor),'leaderboardOptIn',(select leaderboard_opt_in from public.profiles where id=actor),
   'blocks',coalesce((select jsonb_agg(jsonb_build_object('id',blocked_id)) from public.user_blocks where blocker_id=actor),'[]'));
 when 'awards' then
  if resource<>actor and not exists(select 1 from public.profile_cards where user_id=resource and is_public) then raise exception 'Profile unavailable' using errcode='42501';end if;
  select coalesce(jsonb_agg(auth_private.community_item(user_id,milestone::text,'',earned_at,user_id,jsonb_build_object('milestone',milestone)) order by milestone),'[]') into items from public.achievement_awards where user_id=resource;
 else raise exception 'Unknown area' using errcode='22023';
 end case;
 last_item:=items->-1;
 return jsonb_build_object('items',items,'resource',detail,'context',context,'viewerId',actor,'available',true,
  'nextCursor',case when jsonb_array_length(items)=page_size then jsonb_build_object('snapshotAt',page_stamp,'fingerprint',fingerprint,'at',case when p_area='schedule' then last_item->'data'->>'startsAt' when p_area='partners' then page_stamp::text else last_item->>'createdAt' end,'id',last_item->>'id','score',case when p_area='partners' then coalesce((last_item->'data'->>'seconds')::bigint,0) when p_area='feed' and selected_filter='popular' then coalesce((last_item->'data'->>'popularity')::bigint,0) when p_area='tasks' then -coalesce((last_item->'data'->>'position')::bigint,0) else 0 end)::text else null end);
end;$$;

create or replace function public.community_read_v27(p_area text,p_query jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;items jsonb;resource uuid:=(p_query->>'id')::uuid;selected_group uuid:=(p_query->>'groupId')::uuid;
begin
 if auth.uid() is null then raise exception 'Not authorized' using errcode='42501';end if;
 if p_area='schedule' and selected_group is not null and not auth_private.group_member(selected_group,auth.uid()) then raise exception 'Not authorized' using errcode='42501';end if;
 if p_area='feed' and resource is not null and auth_private.can_read_post(resource,auth.uid()) then select group_id into selected_group from public.feed_posts where id=resource;p_query:=p_query||jsonb_build_object('groupId',selected_group);end if;
 result:=public.community_read_base(p_area,p_query);
 if p_area='awards' then
 select coalesce(jsonb_agg(jsonb_set(item,'{id}',to_jsonb(md5((item->>'id')||':'||(item->>'title'))::uuid))),'[]') into items from jsonb_array_elements(result->'items') item;result:=jsonb_set(result,'{items}',items);
 end if;
 return result;
end;$$;
