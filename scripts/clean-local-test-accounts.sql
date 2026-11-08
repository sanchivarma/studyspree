-- Invoked by clean-local-test-accounts.mjs against the fixed local container.
-- Dry-run by default. Never disable constraints or delete non-test study history.
\set ON_ERROR_STOP on
begin;
create temporary table cleanup_users as
 select id from auth.users where email ~ '^(profile|studyspree|diagnostic)-[0-9a-f-]{36}@example[.]test$';
create temporary table cleanup_groups as select id from public.study_groups where owner_id in(select id from cleanup_users);
create temporary table cleanup_rooms as select id from public.study_rooms where not is_system
 and (owner_id in(select id from cleanup_users) or group_id in(select id from cleanup_groups));
create temporary table retained_room_tombstones as select r.id from public.study_rooms r where r.id in(select id from cleanup_rooms)
 and exists(select 1 from public.sessions s where s.user_id not in(select id from cleanup_users)
  and r.id in(s.room_id,s.shared_room_id,s.saved_room_id));
create temporary table cleanup_threads as select id from public.conversation_threads
 where owner_id in(select id from cleanup_users) or group_id in(select id from cleanup_groups);
create temporary table cleanup_posts as select id from public.feed_posts
 where author_id in(select id from cleanup_users) or group_id in(select id from cleanup_groups);
create temporary table cleanup_messages as select id from public.chat_messages
 where author_id in(select id from cleanup_users) or thread_id in(select id from cleanup_threads);
create temporary table preserved_sessions as select id,user_id,started_at,ended_at,actual_seconds,ended_reason
 from public.sessions where user_id not in(select id from cleanup_users);
create temporary table preserved_totals as select * from public.day_stats where user_id not in(select id from cleanup_users);
create temporary table preserved_streaks as select * from public.streaks where user_id not in(select id from cleanup_users);
do $$begin
 if not exists(select 1 from auth.users where email='ss_admin@local.studyspree.test')
  or exists(select 1 from public.study_rooms where id in(select id from cleanup_rooms) and owner_id not in(select id from cleanup_users))
  or exists(select 1 from public.chat_messages where id in(select id from cleanup_messages) and author_id not in(select id from cleanup_users))
  or exists(select 1 from public.feed_posts where id in(select id from cleanup_posts) and author_id not in(select id from cleanup_users))
  or exists(select 1 from public.study_rooms r join public.sessions s on s.id=r.source_session_id
   where s.user_id in(select id from cleanup_users) and r.id not in(select id from cleanup_rooms)) then
  raise exception 'Test fixtures are referenced by non-test data; cleanup was not performed';
 end if;
end;$$;
select (select count(*) from cleanup_users) as test_accounts,
 (select count(*) from cleanup_rooms) as test_rooms,
 (select count(*) from retained_room_tombstones) as room_tombstones_for_real_history,
 (select count(*) from public.study_rooms where room_kind='temporary' and not is_system and deleted_at is null) as temporary_rooms;
\if :apply
-- A deleted tombstone held by the existing local admin preserves real session
-- foreign keys without retaining a test login or rewriting banked history.
update public.study_rooms set is_closed=true,deleted_at=coalesce(deleted_at,now()),group_id=null,source_session_id=null,
 owner_id=(select id from auth.users where email='ss_admin@local.studyspree.test') where id in(select id from retained_room_tombstones);
delete from cleanup_rooms where id in(select id from retained_room_tombstones);
-- Remove references before their targets. Other people's message bodies remain.
update public.thread_members set last_read_message_id=null where last_read_message_id in(select id from cleanup_messages);
update public.chat_messages set parent_id=null where parent_id in(select id from cleanup_messages);
delete from public.chat_messages where id in(select id from cleanup_messages);
delete from public.conversation_threads where id in(select id from cleanup_threads);
update public.feed_posts set parent_id=null where parent_id in(select id from cleanup_posts);
delete from public.feed_posts where id in(select id from cleanup_posts);
delete from public.room_chat_messages where author_id in(select id from cleanup_users) or room_id in(select id from cleanup_rooms);
delete from public.room_visits where user_id in(select id from cleanup_users) or room_id in(select id from cleanup_rooms);
delete from public.room_invites where created_by in(select id from cleanup_users) or room_id in(select id from cleanup_rooms);
delete from public.group_invitations where created_by in(select id from cleanup_users) or group_id in(select id from cleanup_groups);
delete from public.scheduled_sessions where creator_id in(select id from cleanup_users) or room_id in(select id from cleanup_rooms);
update public.study_rooms set source_session_id=null where id in(select id from cleanup_rooms);
-- Let the authorized account-deletion cascade erase test history after its
-- profile is removed; ordinary history deletion is intentionally prohibited.
update public.sessions set room_id=null,shared_room_id=null,saved_room_id=null where user_id in(select id from cleanup_users);
delete from public.study_rooms where id in(select id from cleanup_rooms);
delete from public.study_groups where id in(select id from cleanup_groups);
delete from public.community_reports where reporter_id in(select id from cleanup_users);
delete from public.app_feedback where user_id in(select id from cleanup_users);
delete from auth.users where id in(select id from cleanup_users);
-- Real-account temporary room IDs remain as deleted tombstones for history.
update public.study_rooms set is_closed=true,deleted_at=coalesce(deleted_at,now())
 where room_kind='temporary' and not is_system and deleted_at is null;
update public.room_visits v set left_at=greatest(v.joined_at,now()),sharing_video=false
 from public.study_rooms r where v.room_id=r.id and r.room_kind='temporary' and r.deleted_at is not null and v.left_at is null;
do $$begin
 if exists((select * from preserved_sessions except select id,user_id,started_at,ended_at,actual_seconds,ended_reason from public.sessions)
   union all (select id,user_id,started_at,ended_at,actual_seconds,ended_reason from public.sessions where user_id not in(select id from cleanup_users) except select * from preserved_sessions))
  or exists((select * from preserved_totals except select * from public.day_stats)
   union all (select * from public.day_stats where user_id not in(select id from cleanup_users) except select * from preserved_totals))
  or exists((select * from preserved_streaks except select * from public.streaks)
   union all (select * from public.streaks where user_id not in(select id from cleanup_users) except select * from preserved_streaks))
  or not exists(select 1 from public.study_rooms where is_system and not is_closed and deleted_at is null)
 then raise exception 'Preserved study history or General room changed; cleanup rolled back';end if;
end;$$;
commit;
\else
rollback;
\endif
