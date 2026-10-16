begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values
('70000000-0000-4000-8000-000000000001','limits-a@example.test','{"provider":"email"}','{"username":"limits_a"}'),
('70000000-0000-4000-8000-000000000002','limits-b@example.test','{"provider":"email"}','{"username":"limits_b"}');
insert into public.study_rooms(id,owner_id,name,capacity) values
('71000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','Test room A',4),
('71000000-0000-4000-8000-000000000002','70000000-0000-4000-8000-000000000001','Test room B',4);
-- Duplicate overlaps across two rooms must contribute one hour, not two.
insert into public.room_visits(room_id,user_id,joined_at,last_seen_at,left_at)
select r.id,u.id,now()-interval '1 hour',now(),now() from public.study_rooms r cross join public.profiles u
where r.id in('71000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000002') and u.id in('70000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"70000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((public.community_read('partners')->'items'->0->'data'->>'seconds')::integer,3600,'SQL unions partner overlaps across repeat rooms');
select is((public.community_read('partners')->'items'->0->'data'->>'days')::integer,((now()-interval '1 microsecond') at time zone 'UTC')::date-((now()-interval '1 hour') at time zone 'UTC')::date+1,'SQL counts distinct study days separately from duration');
select public.community_mutate('partner.set','{"targetId":"70000000-0000-4000-8000-000000000002","favorite":true,"notify":true}');
select is(jsonb_array_length(public.community_read('partners','{"filter":"favorites"}')->'items'),1,'Favorites use private real overlap history');
select ok((public.community_read('plans')->'context'->>'usedSeconds')::integer<=3600,'Daily meter unions overlapping visits');
reset role;
update public.plan_policies set daily_room_seconds=0 where plan='free';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"70000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.community_mutate('room.join','{"id":"71000000-0000-4000-8000-000000000001"}')$$,'P0001','Daily room allowance reached','Configured daily allowance enforced server-side');
select throws_ok($$select public.maintain_study_leases()$$,'42501',null,'Browser cannot run service maintenance');
reset role;
update public.plan_policies set daily_room_seconds=null where plan='free';
insert into public.sessions(user_id,started_at,last_heartbeat_at,planned_minutes,theme_slug)
values('70000000-0000-4000-8000-000000000001',now()-interval '10 hours',now()-interval '2 hours',null,'rain-desk');
select lives_ok($$select public.maintain_study_leases()$$,'Trusted maintenance closes stale sessions');
select is((select actual_seconds from public.sessions where user_id='70000000-0000-4000-8000-000000000001'),5400,'Unattended session capped at ninety minutes');
select is((select current_streak from public.streaks where user_id='70000000-0000-4000-8000-000000000001'),0,'Unattended cleanup never changes streak');
select lives_ok($$select public.maintain_study_leases()$$,'Maintenance is idempotent');
select is((select sum(total_seconds) from public.day_stats where user_id='70000000-0000-4000-8000-000000000001'),5400::numeric,'Cleanup banks time once');
insert into public.sessions(user_id,started_at,last_heartbeat_at,planned_minutes,theme_slug)
values('70000000-0000-4000-8000-000000000002',now()-interval '15 minutes',now()-interval '11 minutes',null,'rain-desk');
select public.maintain_study_leases();
select is((select actual_seconds from public.sessions where user_id='70000000-0000-4000-8000-000000000002'),240,'Vanished sessions credit through the last trusted heartbeat');
select is((select ended_at=last_heartbeat_at from public.sessions where user_id='70000000-0000-4000-8000-000000000002'),true,'Cleanup ends at the heartbeat, not at cron execution');
insert into public.room_visits(room_id,user_id) values
('71000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001'),
('71000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"70000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(public.community_dashboard()->>'activeRoomId','71000000-0000-4000-8000-000000000001','Dashboard restores an active room');
select is(jsonb_array_length(public.community_dashboard()->'onlinePeople'),1,'Dashboard shows authorized same-room presence');
select public.community_mutate('room.leave','{"id":"71000000-0000-4000-8000-000000000001"}');
select is(jsonb_array_length(public.community_dashboard()->'onlinePeople'),0,'Leaving a room removes access to its people directory');
select is(public.community_dashboard()->'latestRoom'->>'id','71000000-0000-4000-8000-000000000001','Latest-room recovery survives leaving');
select * from finish();
rollback;
