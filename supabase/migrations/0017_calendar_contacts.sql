-- Contacts require consent; calendar sharing never exposes personal study records.
create table public.study_contacts (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  accepted boolean not null default false,
  created_at timestamptz not null default now(),
  check (requester_id <> recipient_id)
);
create unique index study_contacts_pair on public.study_contacts(least(requester_id,recipient_id),greatest(requester_id,recipient_id));
create table public.contact_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check(length(trim(title)) between 1 and 100),
  created_at timestamptz not null default now()
);
create table public.contact_list_members (
  list_id uuid references public.contact_lists(id) on delete cascade,
  contact_id uuid references public.profiles(id) on delete cascade,
  primary key(list_id,contact_id)
);
create table public.calendar_invitations (
  event_id uuid references public.scheduled_sessions(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  response text not null default 'pending' check(response in('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  primary key(event_id,user_id)
);
alter table public.sessions add column shared_room_id uuid references public.study_rooms(id);
alter table public.scheduled_sessions drop constraint scheduled_sessions_minutes_check;
alter table public.scheduled_sessions add constraint scheduled_sessions_minutes_check check(minutes between 1 and 44640);
alter table public.scheduled_sessions add column ends_at timestamptz;
update public.scheduled_sessions set ends_at=starts_at+make_interval(mins=>minutes);
create function auth_private.calendar_end() returns trigger language plpgsql set search_path='' as $$
begin new.ends_at:=new.starts_at+make_interval(mins=>new.minutes);return new;end;$$;
create trigger calendar_end before insert or update on public.scheduled_sessions for each row execute function auth_private.calendar_end();
alter table public.scheduled_sessions alter column ends_at set not null;
alter table public.app_notifications drop constraint app_notifications_kind_check;
alter table public.app_notifications add constraint app_notifications_kind_check check(kind in('follow','message','booking','cancelled','membership','partner','contact','calendar'));

create function auth_private.is_contact(a uuid,b uuid) returns boolean language sql stable security definer set search_path='' as $$
select exists(select 1 from public.study_contacts where accepted and ((requester_id=a and recipient_id=b) or(requester_id=b and recipient_id=a))) and not auth_private.is_blocked(a,b);$$;
do $$declare t text;begin
foreach t in array array['study_contacts','contact_lists','contact_list_members','calendar_invitations'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
end loop;end;$$;
create policy contacts_self on public.study_contacts for select to authenticated using((requester_id=auth.uid() or recipient_id=auth.uid()) and not auth_private.is_blocked(requester_id,recipient_id));
create policy lists_self on public.contact_lists for select to authenticated using(owner_id=auth.uid());
create policy list_members_self on public.contact_list_members for select to authenticated using(exists(select 1 from public.contact_lists where id=list_id and owner_id=auth.uid()));
create policy invitations_self on public.calendar_invitations for select to authenticated using(user_id=auth.uid() or exists(select 1 from public.scheduled_sessions where id=event_id and creator_id=auth.uid()));

create function public.calendar_mutate(p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
   insert into public.study_rooms(owner_id,name,is_private,capacity) values(actor,coalesce(nullif(session.task,''),'Study session'),true,12) returning id into chosen_room;
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

create function public.calendar_read(p_area text,p_query jsonb default '{}') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid();items jsonb:='[]';context jsonb:='{}';page_offset integer:=coalesce((p_query->>'cursor')::integer,0);
 starts timestamptz:=(p_query->>'from')::timestamptz;ends timestamptz:=(p_query->>'to')::timestamptz;
begin
 if actor is null then raise exception 'Not authorized' using errcode='42501';end if;
 if page_offset not between 0 and 100000 then raise exception 'Invalid page' using errcode='22023';end if;
 if p_area='contacts' then
  select coalesce(jsonb_agg(item),'[]') into items from (
   select auth_private.community_item(c.id,coalesce(nullif(p.display_name,''),p.username),p.username,c.created_at,p.id,jsonb_build_object('accepted',c.accepted,'incoming',c.recipient_id=actor,'contactId',p.id)) item
   from public.study_contacts c join public.profiles p on p.id=case when c.requester_id=actor then c.recipient_id else c.requester_id end
   where actor in(c.requester_id,c.recipient_id) and not auth_private.is_blocked(actor,p.id)
   order by c.accepted desc,c.created_at desc,c.id limit 200 offset page_offset
  ) entries;
  select jsonb_build_object('lists',coalesce(jsonb_agg(jsonb_build_object('id',l.id,'title',l.title,'members',coalesce((select jsonb_agg(m.contact_id) from public.contact_list_members m where m.list_id=l.id and auth_private.is_contact(actor,m.contact_id)),'[]')) order by l.created_at,l.id),'[]')) into context from public.contact_lists l where l.owner_id=actor;
 elsif p_area='calendar' then
  if starts is null or ends is null or ends<=starts or ends>starts+interval '63 days' then raise exception 'Invalid calendar range' using errcode='22023';end if;
  select coalesce(jsonb_agg(item),'[]') into items from (
   select auth_private.community_item(e.id,e.title,'',e.created_at,e.creator_id,jsonb_build_object('startsAt',e.starts_at,'endsAt',e.ends_at,'roomId',e.room_id,'cancelled',e.is_cancelled,'response',case when e.creator_id=actor then 'host' else coalesce(i.response,case when b.user_id is not null then 'accepted' else 'public' end) end,'invitees',case when e.creator_id=actor then coalesce((select jsonb_agg(jsonb_build_object('person',auth_private.person(ci.user_id),'response',ci.response)) from public.calendar_invitations ci where ci.event_id=e.id),'[]') else '[]'::jsonb end)) item
   from public.scheduled_sessions e
   left join public.calendar_invitations i on i.event_id=e.id and i.user_id=actor
   left join public.session_bookings b on b.event_id=e.id and b.user_id=actor
   where e.starts_at<ends and e.ends_at>starts and not auth_private.is_blocked(actor,e.creator_id)
    and(e.creator_id=actor or i.user_id is not null or auth_private.can_read_room(e.room_id,actor))
   order by e.starts_at,e.id limit 200 offset page_offset
  ) entries;
 else raise exception 'Unknown area' using errcode='22023';end if;
 return jsonb_build_object('items',items,'resource',null,'context',context,'viewerId',actor,'available',true,'nextCursor',case when jsonb_array_length(items)=200 then(page_offset+200)::text else null end);
end;$$;
revoke all on function auth_private.calendar_end(),auth_private.is_contact(uuid,uuid),public.calendar_mutate(text,jsonb),public.calendar_read(text,jsonb) from public,anon;
grant execute on function auth_private.is_contact(uuid,uuid),public.calendar_mutate(text,jsonb),public.calendar_read(text,jsonb) to authenticated;
