-- Rooms published by ordinary Study/People sessions are temporary, including
-- future rows created by the older session RPCs. Named permanent rooms have
-- their own identity and never bind their lifetime to a source session.
create function auth_private.classify_session_bound_room() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.source_session_id is not null and not new.is_system then new.room_kind:='temporary';end if;
 return new;
end;$$;
create trigger classify_session_bound_room before insert or update of source_session_id on public.study_rooms
 for each row execute function auth_private.classify_session_bound_room();
revoke all on function auth_private.classify_session_bound_room() from public,anon,authenticated;
update public.study_rooms set room_kind='temporary' where source_session_id is not null and not is_system and room_kind<>'temporary';
