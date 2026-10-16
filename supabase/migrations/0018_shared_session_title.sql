-- Personal tasks allow 500 characters; shared room titles allow 100.
create or replace function public.calendar_mutate(p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();target uuid;resource uuid:=(p_data->>'id')::uuid;result_id uuid;chosen_room uuid;
 event public.scheduled_sessions;contact public.study_contacts;session public.sessions;
 starts timestamptz;ends timestamptz;members uuid[];list_ids uuid[];token_result jsonb;
begin
 if actor is null then raise exception 'Not authorized' using errcode='42501';end if;
 case p_action
 when 'contact.request' then
  select id into target from public.profiles where lower(username)=lower(trim(p_data->>'username')) and id<>actor and not auth_private.is_blocked(id,actor);
  if target is null then raise exception 'Contact unavailable' using errcode='42501';end if;
  insert into public.study_contacts(requester_id,recipient_id) values(actor,target) on conflict do nothing;
  select id into result_id from public.study_contacts where least(requester_id,recipient_id)=least(actor,target) and greatest(requester_id,recipient_id)=greatest(actor,target);
  if exists(select 1 from public.study_contacts where id=result_id and not accepted) and not exists(select 1 from public.app_notifications where user_id=target and actor_id=actor and kind='contact' and resource_id=result_id) then
   insert into public.app_notifications(user_id,actor_id,kind,resource_id) values(target,actor,'contact',result_id);
  end if;
 when 'contact.accept' then
  update public.study_contacts set accepted=true where id=resource and recipient_id=actor and not auth_private.is_blocked(requester_id,actor) returning id into result_id;
 when 'contact.remove' then
  select * into contact from public.study_contacts where id=resource and actor in(requester_id,recipient_id) for update;
  if not found then raise exception 'Contact unavailable' using errcode='42501';end if;
  delete from public.contact_list_members m using public.contact_lists l where m.list_id=l.id and ((l.owner_id=contact.requester_id and m.contact_id=contact.recipient_id) or(l.owner_id=contact.recipient_id and m.contact_id=contact.requester_id));
  delete from public.study_contacts where id=resource;result_id:=resource;
 when 'contact.list.create' then
  select coalesce(array_agg(value::uuid),'{}') into members from jsonb_array_elements_text(p_data->'members');
  if cardinality(members)>100 or exists(select 1 from unnest(members) m where not auth_private.is_contact(actor,m)) then raise exception 'Accepted contacts required' using errcode='42501';end if;
  insert into public.contact_lists(owner_id,title) values(actor,trim(p_data->>'title')) returning id into result_id;
  insert into public.contact_list_members(list_id,contact_id) select result_id,m from unnest(members) m on conflict do nothing;
 when 'contact.list.remove' then
  delete from public.contact_lists where id=resource and owner_id=actor returning id into result_id;
 when 'calendar.create' then
  starts:=(p_data->>'startsAt')::timestamptz;ends:=(p_data->>'endsAt')::timestamptz;
  if starts<=now() or ends<=starts or ends>starts+interval '31 days' or extract(epoch from ends-starts)::bigint%60<>0 then raise exception 'Invalid calendar dates' using errcode='22023';end if;
  select coalesce(array_agg(value::uuid),'{}') into members from jsonb_array_elements_text(p_data->'contacts');
  select coalesce(array_agg(value::uuid),'{}') into list_ids from jsonb_array_elements_text(p_data->'lists');
  if cardinality(members)>100 or cardinality(list_ids)>20 or exists(select 1 from unnest(list_ids) l where not exists(select 1 from public.contact_lists where id=l and owner_id=actor)) then raise exception 'Invalid invitees' using errcode='42501';end if;
  members:=array(select distinct m from (select unnest(members) m union select contact_id from public.contact_list_members where list_id=any(list_ids)) entries);
  if cardinality(members)>100 or exists(select 1 from unnest(members) m where not auth_private.is_contact(actor,m)) then raise exception 'Accepted contacts required' using errcode='42501';end if;
  insert into public.study_rooms(owner_id,name,is_private,capacity) values(actor,trim(p_data->>'title'),true,101) returning id into chosen_room;
  insert into public.room_members(room_id,user_id,role) values(chosen_room,actor,'owner');
  insert into public.scheduled_sessions(creator_id,room_id,title,starts_at,minutes,capacity) values(actor,chosen_room,trim(p_data->>'title'),starts,extract(epoch from ends-starts)::integer/60,101) returning id into result_id;
  insert into public.session_bookings(event_id,user_id) values(result_id,actor);
  insert into public.calendar_invitations(event_id,user_id) select result_id,m from unnest(members) m;
  insert into public.app_notifications(user_id,actor_id,kind,resource_id) select m,actor,'calendar',result_id from unnest(members) m;
 when 'calendar.respond' then
  select * into event from public.scheduled_sessions where id=resource for update;
  if not found or event.is_cancelled or event.ends_at<=now() or auth_private.is_blocked(event.creator_id,actor) or not exists(select 1 from public.calendar_invitations where event_id=resource and user_id=actor) then raise exception 'Invitation unavailable' using errcode='42501';end if;
  if (p_data->>'accept')::boolean then
   if not exists(select 1 from public.session_bookings where event_id=resource and user_id=actor) and(select count(*) from public.session_bookings where event_id=resource)>=event.capacity then raise exception 'Session is full' using errcode='P0001';end if;
   insert into public.room_members(room_id,user_id) values(event.room_id,actor) on conflict do nothing;
   insert into public.session_bookings(event_id,user_id) values(resource,actor) on conflict do nothing;
   update public.calendar_invitations set response='accepted' where event_id=resource and user_id=actor;
  else
   delete from public.session_bookings where event_id=resource and user_id=actor;
   delete from public.room_members where room_id=event.room_id and user_id=actor and role='member';
   update public.room_visits set left_at=now(),sharing_video=false where room_id=event.room_id and user_id=actor and left_at is null;
   update public.calendar_invitations set response='declined' where event_id=resource and user_id=actor;
  end if;result_id:=resource;
 when 'session.share' then
  select * into session from public.sessions where id=resource and user_id=actor and ended_at is null for update;
  if not found then raise exception 'Session unavailable' using errcode='42501';end if;
  chosen_room:=session.shared_room_id;
  if chosen_room is null then
   insert into public.study_rooms(owner_id,name,is_private,capacity) values(actor,left(coalesce(nullif(session.task,''),'Study session'),100),true,12) returning id into chosen_room;
   insert into public.room_members(room_id,user_id,role) values(chosen_room,actor,'owner');
   update public.sessions set shared_room_id=chosen_room where id=resource;
  end if;
  token_result:=public.community_mutate('room.invite',jsonb_build_object('id',chosen_room,'uses',10,'hours',24));
  return jsonb_build_object('id',chosen_room,'token',token_result->>'token');
 else raise exception 'Unknown action' using errcode='22023';
 end case;
 if result_id is null then raise exception 'Record unavailable' using errcode='42501';end if;
 return jsonb_build_object('id',result_id);
end;$$;

