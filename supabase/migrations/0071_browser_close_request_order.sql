-- A request already in flight at pagehide must not reopen its own document.
create or replace function public.sync_session_browser(p_id uuid default null,p_tab uuid default null,p_document uuid default null,p_reload boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); item public.sessions; own public.session_browser_tabs; closed timestamptz; refreshing boolean:=false;
begin
  if actor is null then raise exception 'Not authorized' using errcode='42501'; end if;
  if (p_tab is null) <> (p_document is null) then raise exception 'Invalid browser identity' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
  select * into item from public.sessions where user_id=actor and (p_id is null or id=p_id) and ended_at is null for update;
  if not found then return; end if;
  select * into own from public.session_browser_tabs where session_id=item.id and tab_id=p_tab;
  if own.closed_at is not null and own.document_id=p_document then return; end if;
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
