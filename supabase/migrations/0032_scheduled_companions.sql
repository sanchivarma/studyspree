alter table public.scheduled_sessions alter column room_id drop not null;
alter table public.scheduled_sessions add constraint scheduled_companions_valid check(
 (mode='people' and room_id is not null and character_slugs='[]'::jsonb)
 or(mode='private-characters' and room_id is null and public.valid_companion_selection(jsonb_build_object('mode','characters','characterSlugs',character_slugs)))
);
drop policy schedules_visible on public.scheduled_sessions;
create policy schedules_visible on public.scheduled_sessions for select to authenticated using(creator_id=auth.uid() or(mode='people' and auth_private.can_read_room(room_id,auth.uid())));
-- Extend planned choices for bookings; timestamp accounting and existing-session locks stay unchanged.
do $$declare definition text;begin
 definition:=pg_get_functiondef('public.start_study_session(integer,text,text,jsonb)'::regprocedure);
 if position('not in (5,15,25,50)' in definition)=0 then raise exception 'Unexpected session function';end if;
 execute replace(definition,'not in (5,15,25,50)','not in (5,15,25,30,50,60)');
 definition:=pg_get_functiondef('public.community_read_base(text,jsonb)'::regprocedure);
 execute replace(definition,'then page_stamp::text else','then to_jsonb(page_stamp)#>>''{}'' else');
end;$$;
alter function public.community_mutate(text,jsonb) rename to community_mutate_v31;
revoke all on function public.community_mutate_v31(text,jsonb) from public,anon,authenticated;
create function public.community_mutate(p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();resource uuid:=(p_data->>'id')::uuid;result jsonb;e public.scheduled_sessions;zone text;mode_choice text;characters jsonb;created uuid;session public.sessions;
begin
 if actor is null then raise exception 'Not authorized' using errcode='42501';end if;
 if p_action in('event.create','event.update') then
  zone:=coalesce(p_data->>'timezone',(select timezone from public.profiles where id=actor));
  mode_choice:=coalesce(p_data->>'mode','people');characters:=coalesce(p_data->'characterSlugs','[]');
  if not exists(select 1 from pg_timezone_names where name=zone) or mode_choice not in('people','private-characters')
   or (p_data->>'minutes')::integer not in(30,60) or (p_data->>'startsAt')::timestamptz<=now()
   or length(btrim(p_data->>'title')) not between 1 and 100 or (p_data->>'capacity')::integer not between 1 and 1000
   or(mode_choice='private-characters' and not public.valid_companion_selection(jsonb_build_object('mode','characters','characterSlugs',characters)))
   or(mode_choice='people' and characters<>'[]'::jsonb) then raise exception 'Invalid schedule' using errcode='22023';end if;
  if p_action='event.update' then
   select * into e from public.scheduled_sessions where id=resource for update;
   if not found or e.creator_id<>actor or e.is_cancelled or e.starts_at<=now() or e.mode<>mode_choice then raise exception 'Not authorized' using errcode='42501';end if;
   if (p_data->>'capacity')::integer<(select count(*) from public.session_bookings where event_id=resource) then raise exception 'Capacity is in use' using errcode='23514';end if;
   update public.scheduled_sessions set title=btrim(p_data->>'title'),starts_at=(p_data->>'startsAt')::timestamptz,minutes=(p_data->>'minutes')::integer,capacity=(p_data->>'capacity')::integer,scheduling_timezone=zone,character_slugs=characters where id=resource;
   if e.room_id is not null then update public.study_rooms set name=btrim(p_data->>'title'),capacity=(p_data->>'capacity')::integer where id=e.room_id;end if;
   return jsonb_build_object('id',resource);
  elsif mode_choice='private-characters' then
   if p_data->>'groupId' is not null then raise exception 'Private booking cannot belong to a group' using errcode='22023';end if;
   insert into public.scheduled_sessions(creator_id,title,starts_at,minutes,capacity,mode,character_slugs,scheduling_timezone)
    values(actor,btrim(p_data->>'title'),(p_data->>'startsAt')::timestamptz,(p_data->>'minutes')::integer,1,mode_choice,characters,zone) returning id into created;
   insert into public.session_bookings(event_id,user_id) values(created,actor);
   return jsonb_build_object('id',created);
  end if;
  result:=public.community_mutate_v31(p_action,p_data);
  update public.scheduled_sessions set scheduling_timezone=zone where id=(result->>'id')::uuid;
  return result;
 elsif p_action='event.start' then
  select * into e from public.scheduled_sessions where id=resource;
  if not found or e.is_cancelled or e.starts_at>now() or now()>=e.starts_at+make_interval(mins=>e.minutes)
   or not exists(select 1 from public.session_bookings where event_id=e.id and user_id=actor)
   or(e.mode='private-characters' and e.creator_id<>actor) then raise exception 'Booking not active' using errcode='42501';end if;
  if e.mode='people' then perform public.join_room_with_goal(e.room_id,e.title);end if;
  select * into session from public.start_study_session(e.minutes,(select selected_theme from public.profiles where id=actor),e.title,
   jsonb_build_object('mode',case when e.mode='private-characters' then 'characters' else 'people' end,'characterSlugs',e.character_slugs));
  return jsonb_build_object('id',case when e.mode='people' then e.room_id else session.id end,'kind',case when e.mode='people' then 'room' else 'session' end);
 end if;
 return public.community_mutate_v31(p_action,p_data);
end;$$;
revoke all on function public.community_mutate(text,jsonb) from public,anon;
grant execute on function public.community_mutate(text,jsonb) to authenticated;

-- Enforce the new choices for writes without deleting legacy free-form tags.
create function auth_private.validate_partner_choices() returns trigger language plpgsql set search_path='' as $$
begin
 if (tg_op='INSERT' or new.looking_for is distinct from old.looking_for) and not(new.looking_for<@array['accountability','study-buddy','community']::text[]) then raise exception 'Invalid partner choices' using errcode='22023';end if;
 return new;
end;$$;
create trigger partner_choices before insert or update of looking_for on public.profile_cards for each row execute function auth_private.validate_partner_choices();
revoke all on function auth_private.validate_partner_choices() from public,anon,authenticated;
