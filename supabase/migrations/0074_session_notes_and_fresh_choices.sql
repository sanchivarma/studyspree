-- Private session notes, retired choices and cleanup at the trusted end boundary.
create table public.session_notes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null,
  body text not null check (length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default clock_timestamp(),
  unique (user_id,client_id)
);
create index session_notes_order on public.session_notes(session_id,created_at,id);
alter table public.session_notes enable row level security;
revoke all on public.session_notes from public,anon,authenticated;
grant select on public.session_notes to authenticated;
create policy own_session_notes on public.session_notes for select to authenticated using (user_id=auth.uid());

create function public.read_session_notes(p_session uuid,p_after_at timestamptz default null,p_after_id uuid default null)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare items jsonb; more boolean; last_item jsonb;
begin
  if not exists(select 1 from public.sessions where id=p_session and user_id=auth.uid()) then
    raise exception 'Session unavailable' using errcode='42501';
  end if;
  if (p_after_at is null)<>(p_after_id is null) then raise exception 'Invalid cursor' using errcode='22023';end if;
  select coalesce(jsonb_agg(item order by stamp,note_id),'[]') into items from (
    select jsonb_build_object('id',id,'sessionId',session_id,'body',body,'createdAt',created_at) item,created_at stamp,id note_id
    from public.session_notes where session_id=p_session
      and (p_after_at is null or (created_at,id)>(p_after_at,p_after_id))
    order by created_at,id limit 51
  ) notes;
  more:=jsonb_array_length(items)>50;
  if more then items:=items-50;end if;
  last_item:=items->(jsonb_array_length(items)-1);
  return jsonb_build_object('items',items,'nextCursor',case when more then
    jsonb_build_object('at',last_item->'createdAt','id',last_item->'id') else null end);
end;$$;

create function public.add_session_note(p_session uuid,p_body text,p_client uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); entry public.session_notes; session_row public.sessions;
begin
  if actor is null then raise exception 'Sign in required' using errcode='42501';end if;
  if p_body is null or length(btrim(p_body)) not between 1 and 2000 or p_client is null then
    raise exception 'Invalid note' using errcode='22023';end if;
  select * into session_row from public.sessions where id=p_session and user_id=actor for update;
  if not found then raise exception 'Session unavailable' using errcode='42501';end if;
  select * into entry from public.session_notes where user_id=actor and client_id=p_client;
  if found then
    if entry.session_id<>p_session or entry.body<>btrim(p_body) then raise exception 'Retry differs' using errcode='22023';end if;
  else
    if session_row.ended_at is not null then raise exception 'Session finished' using errcode='42501';end if;
    if (select count(*) from public.session_notes where user_id=actor and created_at>clock_timestamp()-interval '1 minute')>=50 then
      raise exception 'Please wait a moment' using errcode='54000';end if;
    insert into public.session_notes(session_id,user_id,client_id,body) values(p_session,actor,p_client,btrim(p_body)) returning * into entry;
  end if;
  return jsonb_build_object('id',entry.id,'sessionId',entry.session_id,'body',entry.body,'createdAt',entry.created_at);
end;$$;
revoke all on function public.read_session_notes(uuid,timestamptz,uuid),public.add_session_note(uuid,text,uuid) from public,anon;
grant execute on function public.read_session_notes(uuid,timestamptz,uuid),public.add_session_note(uuid,text,uuid) to authenticated;

-- Retired partners stay valid in historical records, preserving recorded hours.
-- They cannot be submitted as new selections through any database write path.
update public.profiles set companion_preferences='{"mode":"solo","characterSlugs":[]}'
where companion_preferences->'characterSlugs' ?| array['medieval-scholar','medieval-scribe'];
update public.study_rooms r set controls=jsonb_set(controls,'{characterSlugs}',(
  select coalesce(jsonb_agg(value order by ordinal),'[]') from jsonb_array_elements(r.controls->'characterSlugs') with ordinality as x(value,ordinal)
  where value#>>'{}' not in('medieval-scholar','medieval-scribe')
)) where controls->'characterSlugs' ?| array['medieval-scholar','medieval-scribe'];

create function auth_private.reject_retired_choices() returns trigger language plpgsql set search_path='' as $$
declare choices jsonb;
begin
  if tg_table_name='profiles' then choices:=new.companion_preferences->'characterSlugs';
  elsif tg_table_name='study_rooms' then choices:=new.controls->'characterSlugs';
  else choices:=new.companions->'characterSlugs';end if;
  if choices ?| array['medieval-scholar','medieval-scribe'] then raise exception 'Retired partner' using errcode='22023';end if;
  return new;
end;$$;
revoke all on function auth_private.reject_retired_choices() from public,anon,authenticated;
create trigger reject_retired_profile_choices before insert or update of companion_preferences on public.profiles
for each row execute function auth_private.reject_retired_choices();
create trigger reject_retired_room_choices before insert or update of controls on public.study_rooms
for each row execute function auth_private.reject_retired_choices();
create trigger reject_retired_session_choices before insert or update of companions on public.sessions
for each row execute function auth_private.reject_retired_choices();

create function auth_private.clear_finished_session_choices() returns trigger language plpgsql security definer set search_path='' as $$
begin
  update public.profiles set companion_preferences='{"mode":"solo","characterSlugs":[]}',selected_theme='rain-desk',
    solo_scene='{"desk":"modern","window":"sea"}',webcam_enabled=false,ambience_enabled=false,
    music_track=null,background_effects='[]',effect_volumes='{}',music_volume=0,room_volume=0,
    personal_tile=jsonb_set(personal_tile,'{status}','""') where id=new.user_id;
  delete from public.session_browser_tabs where session_id=new.id;
  return new;
end;$$;
revoke all on function auth_private.clear_finished_session_choices() from public,anon,authenticated;
create trigger clear_finished_session_choices after update of ended_at on public.sessions
for each row when (old.ended_at is null and new.ended_at is not null) execute function auth_private.clear_finished_session_choices();
