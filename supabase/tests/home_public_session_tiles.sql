begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(18);
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values
('a8720000-0000-4000-8000-000000000001','tiles-solo@example.test','{"provider":"email"}','{"username":"tiles_solo"}'),
('a8720000-0000-4000-8000-000000000002','tiles-private@example.test','{"provider":"email"}','{"username":"tiles_private"}'),
('a8720000-0000-4000-8000-000000000003','tiles-virtual@example.test','{"provider":"email"}','{"username":"tiles_virtual"}'),
('a8720000-0000-4000-8000-000000000004','tiles-people@example.test','{"provider":"email"}','{"username":"tiles_people"}'),
('a8720000-0000-4000-8000-000000000005','tiles-viewer@example.test','{"provider":"email"}','{"username":"tiles_viewer"}');
select is((select count(*) from study_rooms where is_system),1::bigint,'Exactly one permanent General Study Room');
select is((select name from study_rooms where is_system),'StudySpree General Study Room','Permanent room has the requested name');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a8720000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('test.tile_solo',(public.start_session_with_details(null,'rain-desk',null,'{"mode":"solo","characterSlugs":[]}','Public Solo',null,'public')).id::text,true);
select set_config('request.jwt.claims','{"sub":"a8720000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select set_config('test.tile_private',(public.start_session_with_details(null,'rain-desk',null,'{"mode":"characters","characterSlugs":["male-02"]}','Private partners',null,'private')).id::text,true);
select set_config('request.jwt.claims','{"sub":"a8720000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select set_config('test.tile_virtual',(public.start_session_with_details(null,'night-shift',null,'{"mode":"characters","characterSlugs":["female-04"]}','Reading with Maya','Read together.','public')).id::text,true);
select set_config('test.tile_room',(select room_id::text from sessions where id=current_setting('test.tile_virtual')::uuid),true);
select set_config('request.jwt.claims','{"sub":"a8720000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select set_config('test.tile_people',(public.start_session_with_details(null,'rain-desk',null,'{"mode":"people","characterSlugs":[]}','People studying',null,'public')).id::text,true);
select set_config('request.jwt.claims','{"sub":"a8720000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select set_config('test.tiles',public.community_read('publicSessions')::text,true);
select is((select count(*) from jsonb_array_elements(current_setting('test.tiles')::jsonb->'items') i where i->'data'->>'sessionId'=current_setting('test.tile_solo')),0::bigint,'Public Solo sessions are excluded');
select is((select count(*) from jsonb_array_elements(current_setting('test.tiles')::jsonb->'items') i where i->'data'->>'sessionId'=current_setting('test.tile_private')),0::bigint,'Private virtual sessions are excluded');
select is((select count(*) from jsonb_array_elements(current_setting('test.tiles')::jsonb->'items') i where i->'data'->>'sessionId'=current_setting('test.tile_virtual')),1::bigint,'Public virtual session is discoverable');
select is((select count(*) from jsonb_array_elements(current_setting('test.tiles')::jsonb->'items') i where i->'data'->>'sessionId'=current_setting('test.tile_people')),1::bigint,'Public people session is discoverable');
select is((select i->>'title' from jsonb_array_elements(current_setting('test.tiles')::jsonb->'items') i where i->>'id'=current_setting('test.tile_room')),'Reading with Maya','Tile carries the session name');
select is((select i->'data'->'characterSlugs' from jsonb_array_elements(current_setting('test.tiles')::jsonb->'items') i where i->>'id'=current_setting('test.tile_room')),'["female-04"]'::jsonb,'Tile carries explicitly joined virtual characters');
select is((select (i->'data'->>'humanCount')::int from jsonb_array_elements(current_setting('test.tiles')::jsonb->'items') i where i->>'id'=current_setting('test.tile_room')),1,'Host is counted once');
select is((select (i->'data'->>'capacity')::int from jsonb_array_elements(current_setting('test.tiles')::jsonb->'items') i where i->>'id'=current_setting('test.tile_room')),60,'Tile carries actual room capacity');
select public.join_room_with_goal(current_setting('test.tile_room')::uuid,null);
select is((select (i->'data'->>'humanCount')::int from jsonb_array_elements(public.community_read('publicSessions')->'items') i where i->>'id'=current_setting('test.tile_room')),2,'Joining immediately updates the live people count');
select is(current_setting('test.tiles')::jsonb->'context'->'defaultRoom'->>'id','00000000-0000-4000-8000-000000000060','Pinned room is separate from paginated live sessions');
select is(current_setting('test.tiles')::jsonb->'context'->'defaultRoom'->'data'->'characterSlugs','[]'::jsonb,'General room remains people-only');
select set_config('test.tiles_page1',public.community_read('publicSessions','{"limit":1}')::text,true);
select set_config('test.tiles_page2',public.community_read('publicSessions',jsonb_build_object('limit',1,'cursor',current_setting('test.tiles_page1')::jsonb->>'nextCursor'))::text,true);
select is(jsonb_array_length(current_setting('test.tiles_page2')::jsonb->'items'),1,'All eligible sessions can be paginated');
select isnt(current_setting('test.tiles_page1')::jsonb->'items'->0->>'id',current_setting('test.tiles_page2')::jsonb->'items'->0->>'id','Pagination does not duplicate sessions');
select set_config('request.jwt.claims','{"sub":"a8720000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select public.finish_study_session(current_setting('test.tile_virtual')::uuid,'stopped_early');
select is((select count(*) from jsonb_array_elements(public.community_read('publicSessions')->'items') i where i->>'id'=current_setting('test.tile_room')),0::bigint,'Finished sessions leave the directory');
reset role;
select is((select controls->'characterSlugs' from study_rooms where id=current_setting('test.tile_room')::uuid),'["female-04"]'::jsonb,'Shared room starts with the host-selected virtual characters');
set local role anon;
select throws_ok($$select public.community_read('publicSessions')$$,'42501',null,'The directory preserves the signed-in account boundary');
reset role;
select * from finish();
rollback;
