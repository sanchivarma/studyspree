-- Browser close is distinct from loss of focus. Only server timestamps count.
create table public.session_browser_tabs (
  session_id uuid not null references public.sessions(id) on delete cascade,
  tab_id uuid not null,
  document_id uuid not null,
  closed_at timestamptz,
  primary key (session_id, tab_id)
);
alter table public.session_browser_tabs enable row level security;
revoke all on public.session_browser_tabs from public, anon, authenticated;

create function auth_private.finish_browser_session(p_id uuid, p_closed_at timestamptz)
returns void language plpgsql security definer set search_path='' as $$
declare item public.sessions; streak public.streaks; activity jsonb; next_state jsonb;
begin
  select * into item from public.sessions where id=p_id for update;
  if not found or item.ended_at is not null then return; end if;
  select * into streak from public.streaks where user_id=item.user_id for update;
  activity:=public.apply_streak_activity(jsonb_build_object('current',streak.current_streak,'best',streak.best_streak,
    'lastActiveDate',streak.last_active_date,'freezesRemaining',streak.freezes_remaining,'freezesResetAt',streak.freezes_reset_at),item.local_date);
  next_state:=activity->'state';
  update public.streaks set current_streak=(next_state->>'current')::int,best_streak=(next_state->>'best')::int,
    last_active_date=(next_state->>'lastActiveDate')::date,freezes_remaining=(next_state->>'freezesRemaining')::int,
    freezes_reset_at=(next_state->>'freezesResetAt')::date where user_id=item.user_id;
  update public.sessions set ended_at=greatest(item.started_at,least(p_closed_at,clock_timestamp())),ended_reason='stopped_early',
    streak_changed=(activity->>'changed')::boolean,freeze_used=(activity->>'freezeUsed')::boolean where id=p_id;
  update public.room_visits set left_at=greatest(joined_at,p_closed_at),sharing_video=false
    where user_id=item.user_id and room_id=item.room_id and left_at is null;
end; $$;
revoke all on function auth_private.finish_browser_session(uuid,timestamptz) from public,anon,authenticated;

create function public.sync_session_browser(p_id uuid default null,p_tab uuid default null,p_document uuid default null,p_reload boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); item public.sessions; own public.session_browser_tabs; closed timestamptz; refreshing boolean:=false;
begin
  if actor is null then raise exception 'Not authorized' using errcode='42501'; end if;
  if (p_tab is null) <> (p_document is null) then raise exception 'Invalid browser identity' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
  select * into item from public.sessions where user_id=actor and (p_id is null or id=p_id) and ended_at is null for update;
  if not found then return; end if;
  select * into own from public.session_browser_tabs where session_id=item.id and tab_id=p_tab;
  refreshing:=coalesce(p_reload and own.closed_at is not null and own.document_id<>p_document and own.closed_at>clock_timestamp()-interval '30 seconds',false);
  if refreshing then
    update public.session_browser_tabs set document_id=p_document,closed_at=null where session_id=item.id and tab_id=p_tab;
  end if;
  select max(closed_at) into closed from public.session_browser_tabs where session_id=item.id;
  if closed is not null and not exists(select 1 from public.session_browser_tabs where session_id=item.id and closed_at is null) then
    if closed<=clock_timestamp()-interval '30 seconds' or (p_tab is not null and (own.tab_id is null or (own.document_id<>p_document and not p_reload))) then
      perform auth_private.finish_browser_session(item.id,closed);
    end if;
    return;
  end if;
  if p_tab is not null then
    insert into public.session_browser_tabs(session_id,tab_id,document_id) values(item.id,p_tab,p_document)
      on conflict(session_id,tab_id) do update set document_id=excluded.document_id,closed_at=null;
  end if;
end; $$;

create function public.close_session_browser_tab(p_id uuid,p_tab uuid,p_document uuid)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
  if actor is null then raise exception 'Not authorized' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
  update public.session_browser_tabs t set closed_at=coalesce(t.closed_at,clock_timestamp())
    where t.session_id=p_id and t.tab_id=p_tab and t.document_id=p_document
    and exists(select 1 from public.sessions s where s.id=p_id and s.user_id=actor and s.ended_at is null);
end; $$;
revoke all on function public.sync_session_browser(uuid,uuid,uuid,boolean),public.close_session_browser_tab(uuid,uuid,uuid) from public,anon;
grant execute on function public.sync_session_browser(uuid,uuid,uuid,boolean),public.close_session_browser_tab(uuid,uuid,uuid) to authenticated;

-- Preserve existing maintenance contracts; settle explicit closes first.
alter function public.maintain_study_leases() rename to maintain_study_leases_before_browser_close;
revoke all on function public.maintain_study_leases_before_browser_close() from public,anon,authenticated,service_role;
create function public.maintain_study_leases() returns jsonb language plpgsql security definer set search_path='' as $$
declare item record;
begin
  for item in select s.id,s.user_id,max(t.closed_at) as closed_at from public.sessions s
    join public.session_browser_tabs t on t.session_id=s.id where s.ended_at is null
    group by s.id,s.user_id having bool_and(t.closed_at is not null) and max(t.closed_at)<=clock_timestamp()-interval '30 seconds'
  loop
    perform pg_advisory_xact_lock(hashtextextended(item.user_id::text,0));
    -- Recheck after taking the lock: a refresh may have reopened the tab.
    if not exists(select 1 from public.session_browser_tabs where session_id=item.id and closed_at is null) then
      perform auth_private.finish_browser_session(item.id,item.closed_at);
    end if;
  end loop;
  return public.maintain_study_leases_before_browser_close();
end; $$;
revoke all on function public.maintain_study_leases() from public,anon,authenticated;
grant execute on function public.maintain_study_leases() to service_role;
