-- Personal calendars include hosted, invited and booked sessions, not public discovery.
create or replace function public.calendar_read(p_area text,p_query jsonb default '{}') returns jsonb language plpgsql stable security definer set search_path='' as $$
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
    and(e.creator_id=actor or i.user_id is not null or b.user_id is not null)
   order by e.starts_at,e.id limit 200 offset page_offset
  ) entries;
 else raise exception 'Unknown area' using errcode='22023';end if;
 return jsonb_build_object('items',items,'resource',null,'context',context,'viewerId',actor,'available',true,'nextCursor',case when jsonb_array_length(items)=200 then(page_offset+200)::text else null end);
end;$$;
