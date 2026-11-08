begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values
 ('78000000-0000-4000-8000-000000000001','saved-a@example.test','{"provider":"email"}','{"username":"saved_a"}'),
 ('78000000-0000-4000-8000-000000000002','saved-b@example.test','{"provider":"email"}','{"username":"saved_b"}');
create temporary table fixtures(kind text primary key,id uuid);
grant all on fixtures to authenticated;
create function pg_temp.fixture_room_count() returns bigint language sql as $$
 select count(*) from jsonb_array_elements(public.community_read('savedRooms','{"limit":100}')->'items') item
 where (item->>'id')::uuid in(select id from fixtures);
$$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"78000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into fixtures values('solo',(public.community_mutate('room.create',jsonb_build_object(
 'title','My quiet desk','body','','roomKind','permanent-solo','capacity',60,
 'controls','{"themeSlug":"night-shift","characterSlugs":[],"audio":{"musicTrack":null,"musicVolume":0,"roomVolume":0,"backgroundEffects":[],"effectVolumes":{}}}'::jsonb,
 'soloView','{"desk":"none","window":"magic-academy"}'::jsonb))->>'id')::uuid);
insert into fixtures values('shared',(public.community_mutate('room.create',jsonb_build_object(
 'title','Shared revision','body','','roomKind','permanent-shared','capacity',60,
 'controls','{"themeSlug":"rain-desk","characterSlugs":["male-01"],"audio":{"musicTrack":null,"musicVolume":0,"roomVolume":0,"backgroundEffects":[],"effectVolumes":{}}}'::jsonb))->>'id')::uuid);
insert into fixtures values('temporary',(public.community_mutate('room.create',jsonb_build_object(
 'title','One visit','body','','roomKind','temporary','capacity',60,
 'controls','{"themeSlug":"rain-desk","characterSlugs":[],"audio":{"musicTrack":null,"musicVolume":0,"roomVolume":0,"backgroundEffects":[],"effectVolumes":{}}}'::jsonb))->>'id')::uuid);
select is(pg_temp.fixture_room_count(),2::bigint,'Dashboard lists both permanent types, excluding temporary rooms');
select is(public.community_read('savedRooms')->'context'->'defaultRoom'->>'id','00000000-0000-4000-8000-000000000060','General Study Room is pinned separately');
select is(public.community_read('room',jsonb_build_object('id',(select id from fixtures where kind='solo')))->'context'->'soloView',
 '{"desk":"none","window":"magic-academy"}'::jsonb,'No table and window are saved per Solo room');
select throws_ok($$select public.community_mutate('room.join',jsonb_build_object('id',(select id from fixtures where kind='solo')))$$,'42501',null,'Solo rooms cannot become shared through Join');
select lives_ok($$select public.start_saved_solo_room((select id from fixtures where kind='solo'))$$,'Saved Solo room starts a real timed session');
select is((select solo_scene from public.profiles where id=auth.uid()),'{"desk":"none","window":"magic-academy"}'::jsonb,'Entering Solo restores that room view');
select is((select companions->>'mode' from public.sessions where user_id=auth.uid() and ended_at is null),'solo','Saved Solo sessions keep Solo mode');
select is((select room_id from public.sessions where user_id=auth.uid() and ended_at is null),null::uuid,'Solo sessions do not use shared media rooms');
update public.profiles set solo_scene='{"desk":"pirate","window":"waterfall"}' where id=auth.uid();
select is((select solo_view from public.study_rooms where id=(select id from fixtures where kind='solo')),
 '{"desk":"pirate","window":"waterfall"}'::jsonb,'Scenery changes while studying update the saved room');
select public.finish_study_session((select id from public.sessions where user_id=auth.uid() and ended_at is null),'stopped_early');
update public.profiles set solo_scene='{"desk":"modern","window":"sea"}' where id=auth.uid();
select is((select solo_view from public.study_rooms where id=(select id from fixtures where kind='solo')),
 '{"desk":"pirate","window":"waterfall"}'::jsonb,'Unrelated Settings changes do not overwrite an inactive room');
select lives_ok($$select public.start_saved_solo_room((select id from fixtures where kind='solo'))$$,'Permanent Solo reopens after Finish');
select is((select solo_scene from public.profiles where id=auth.uid()),'{"desk":"pirate","window":"waterfall"}'::jsonb,'Reopening restores updated room settings');
select public.finish_study_session((select id from public.sessions where user_id=auth.uid() and ended_at is null),'stopped_early');
select is(pg_temp.fixture_room_count(),2::bigint,'Permanent rooms survive completed sessions');
select public.join_room_with_goal((select id from fixtures where kind='temporary'),'');
select lives_ok($$select public.start_room_session(null,'rain-desk',null,'{"mode":"people","characterSlugs":[]}',(select id from fixtures where kind='temporary'))$$,'Temporary room starts with no partners');
select public.finish_study_session((select id from public.sessions where user_id=auth.uid() and ended_at is null),'stopped_early');
select throws_ok($$select public.join_room_with_goal((select id from fixtures where kind='temporary'),'')$$,'42501',null,'Temporary room closes when its creator finishes');
select set_config('request.jwt.claims','{"sub":"78000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is(pg_temp.fixture_room_count(),0::bigint,'Unlisted rooms do not appear to unrelated accounts');
select throws_ok($$select public.community_read('room',jsonb_build_object('id',(select id from fixtures where kind='solo')))$$,'42501',null,'Solo room metadata stays private');
select throws_ok($$select public.start_saved_solo_room((select id from fixtures where kind='solo'))$$,'42501',null,'Another account cannot start a private Solo room');
select lives_ok($$select public.join_room_with_goal((select id from fixtures where kind='shared'),'')$$,'URL or ID grants access to unlisted Shared room');
select is(pg_temp.fixture_room_count(),1::bigint,'Joining saves a permanent Shared room for the next login');
select is(public.community_read('room',jsonb_build_object('id',(select id from fixtures where kind='shared')))->'context'->'controls'->'characterSlugs',
 '["male-01"]'::jsonb,'Virtual and real partners coexist in Shared room');
select lives_ok($$select public.start_room_session(null,'rain-desk',null,'{"mode":"mixed","characterSlugs":["male-01"]}',(select id from fixtures where kind='shared'))$$,'Guest can study with a virtual partner in a permanent Shared room');
select throws_ok($$select public.community_mutate('room.delete',jsonb_build_object('id',(select id from fixtures where kind='shared')))$$,'42501',null,'Non-admin cannot delete room');
select throws_ok($$select public.community_mutate('room.delete','{"id":"00000000-0000-4000-8000-000000000060"}')$$,'42501',null,'General room cannot be deleted');
select set_config('request.jwt.claims','{"sub":"78000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select lives_ok($$select public.community_mutate('room.delete',jsonb_build_object('id',(select id from fixtures where kind='shared')))$$,'Creator can delete Shared room');
select lives_ok($$select public.community_mutate('room.delete',jsonb_build_object('id',(select id from fixtures where kind='shared')))$$,'Deletion retries are idempotent');
select is(pg_temp.fixture_room_count(),1::bigint,'Deleted room disappears from creator Dashboard');
select is((select count(*) from public.sessions where user_id=auth.uid()),3::bigint,'Deleting rooms preserves all banked session history');
select set_config('request.jwt.claims','{"sub":"78000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is(public.community_read('room',jsonb_build_object('id',(select id from fixtures where kind='shared')))->'context'->'deleted','true'::jsonb,'Old URL returns explicit deletion state to non-admin');
select is(public.community_read('room',jsonb_build_object('id',(select id from fixtures where kind='shared')))->'resource','null'::jsonb,'Deleted response reveals no previous room details');
select is((select count(*) from public.sessions where user_id=auth.uid() and ended_at is null),1::bigint,'Deleting a room leaves the guest in control of their own timer');
select lives_ok($$select public.finish_study_session((select id from public.sessions where user_id=auth.uid() and ended_at is null),'stopped_early')$$,'Guest can finish and bank their own session after deletion');
select is((select count(*) from public.sessions where user_id=auth.uid() and ended_at is not null),1::bigint,'Finished guest session remains in history');
select is((select count(*) from public.study_rooms where id=(select id from fixtures where kind='shared')),0::bigint,'RLS hides deleted room from direct reads');
select is(pg_temp.fixture_room_count(),0::bigint,'Deleted Shared room disappears from guest Dashboard');
select throws_ok($$select public.join_room_with_goal((select id from fixtures where kind='shared'),'')$$,'42501',null,'Deleted room rejects subsequent joins');
select throws_ok($$select public.send_room_chat((select id from fixtures where kind='shared'),'Hello',gen_random_uuid())$$,'42501',null,'Deletion revokes chat access');
select set_config('request.jwt.claims','{"sub":"78000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.start_session_with_details(null,'rain-desk',null,'{"mode":"characters","characterSlugs":[]}', 'Published visit',null,'public');
select is((select room_kind from public.study_rooms where source_session_id=(select id from public.sessions where user_id=auth.uid() and ended_at is null)),
 'temporary','Future ordinary public sessions are classified as temporary');
select ok(not exists(select 1 from jsonb_array_elements(public.community_read('savedRooms','{"limit":100}')->'items') item
 where item->>'title'='Published visit'),'Ordinary public sessions do not enter permanent Dashboard tiles');
select public.finish_study_session((select id from public.sessions where user_id=auth.uid() and ended_at is null),'stopped_early');
reset role;
select * from finish();
rollback;
