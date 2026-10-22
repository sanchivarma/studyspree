-- Session choices are distinct from intentional account Settings. Replace the
-- earlier cleanup so theme, scenery, camera and sound preferences are preserved.
create or replace function auth_private.clear_finished_session_choices() returns trigger language plpgsql security definer set search_path='' as $$
begin
  update public.profiles set companion_preferences='{"mode":"solo","characterSlugs":[]}',
    personal_tile=jsonb_set(personal_tile,'{status}','""') where id=new.user_id;
  delete from public.session_browser_tabs where session_id=new.id;
  return new;
end;$$;

-- Remove obsolete last-session partner defaults without changing account
-- Settings, ongoing sessions, history, timestamps or banked study time.
update public.profiles p set companion_preferences='{"mode":"solo","characterSlugs":[]}'
where exists(select 1 from public.sessions s where s.user_id=p.id and s.ended_at is not null)
  and not exists(select 1 from public.sessions s where s.user_id=p.id and s.ended_at is null);
