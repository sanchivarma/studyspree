begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values
 ('80000000-0000-4000-8000-000000000001','saved-owner@example.test','{"provider":"email"}','{"username":"saved_owner"}'),
 ('80000000-0000-4000-8000-000000000002','saved-guest@example.test','{"provider":"email"}','{"username":"saved_guest"}');
create temporary table fixtures(kind text primary key,id uuid);
grant all on fixtures to authenticated;
create temporary table token_value(value text);
grant all on token_value to authenticated;
select ok((select relrowsecurity from pg_class where oid='public.saved_study_rooms'::regclass),'Personal saves have RLS');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"80000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into fixtures values('shared',(public.community_mutate('room.create',jsonb_build_object(
 'title','Saved together','body','','roomKind','permanent-shared','capacity',60,
 'controls','{"themeSlug":"rain-desk","characterSlugs":[],"audio":{"musicTrack":null,"musicVolume":0,"roomVolume":0,"backgroundEffects":[],"effectVolumes":{}}}'::jsonb))->>'id')::uuid);
insert into fixtures values('temporary',(public.community_mutate('room.create',jsonb_build_object(
 'title','Temporary visit','body','','roomKind','temporary','capacity',60,
 'controls','{"themeSlug":"rain-desk","characterSlugs":[],"audio":{"musicTrack":null,"musicVolume":0,"roomVolume":0,"backgroundEffects":[],"effectVolumes":{}}}'::jsonb))->>'id')::uuid);
select is((select count(*) from public.saved_study_rooms where user_id=auth.uid() and room_id in(select id from fixtures)),1::bigint,'Creating saves permanent rooms, excluding temporary rooms');
select throws_ok($$select public.community_mutate('room.unsave',jsonb_build_object('id',(select id from fixtures where kind='shared')))$$,'42501',null,'Creator must use confirmed deletion, not guest removal');
select throws_ok($$select public.community_mutate('room.unsave','{"id":"00000000-0000-4000-8000-000000000060"}')$$,'42501',null,'Pinned General room cannot be removed');
-- Room invite tokens are held in a local temp table instead of test output.
insert into token_value select public.community_mutate('room.invite',jsonb_build_object('id',(select id from fixtures where kind='shared'),'uses',2,'hours',24))->>'token';
select set_config('request.jwt.claims','{"sub":"80000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.saved_study_rooms where room_id=(select id from fixtures where kind='shared')),0::bigint,'RLS hides another user saved record');
select ok(not exists(select 1 from jsonb_array_elements(public.community_read('savedRooms')->'items') item where item->>'id'=(select id::text from fixtures where kind='shared')),'Other public or unlisted rooms are not automatically personal saves');
select lives_ok($$select public.community_mutate('invite.accept',jsonb_build_object('token',(select value from token_value)))$$,'Accepting a permanent room invitation saves it');
select is((select count(*) from public.saved_study_rooms where room_id=(select id from fixtures where kind='shared')),1::bigint,'Invitation adds the guest own saved record');
select public.join_room_with_goal((select id from fixtures where kind='shared'),'');
select lives_ok($$select public.community_mutate('room.unsave',jsonb_build_object('id',(select id from fixtures where kind='shared')))$$,'Guest can remove a saved room');
select lives_ok($$select public.community_mutate('room.unsave',jsonb_build_object('id',(select id from fixtures where kind='shared')))$$,'Guest removal retries are idempotent');
select is((select count(*) from public.saved_study_rooms where room_id=(select id from fixtures where kind='shared')),0::bigint,'Guest removal deletes their database record');
select ok(not exists(select 1 from jsonb_array_elements(public.community_read('savedRooms')->'items') item where item->>'id'=(select id::text from fixtures where kind='shared')),'Removed room is absent on a new Dashboard read');
select lives_ok($$select public.community_read('room',jsonb_build_object('id',(select id from fixtures where kind='shared')))$$,'Guest removal preserves access through the URL');
select public.join_room_with_goal((select id from fixtures where kind='shared'),'');
select is((select count(*) from public.saved_study_rooms where room_id=(select id from fixtures where kind='shared')),1::bigint,'Rejoining an already active visit saves the room once more');
select public.join_room_with_goal((select id from fixtures where kind='temporary'),'');
select is((select count(*) from public.saved_study_rooms where room_id=(select id from fixtures where kind='temporary')),0::bigint,'Joining a temporary room never saves it');
select throws_ok($$insert into public.saved_study_rooms(user_id,room_id) values('80000000-0000-4000-8000-000000000001',(select id from fixtures where kind='shared'))$$,'42501',null,'Clients cannot forge another user saved rows');
select set_config('request.jwt.claims','{"sub":"80000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*) from public.saved_study_rooms where room_id=(select id from fixtures where kind='shared')),1::bigint,'Guest removal has not changed the creator saved record');
select public.community_mutate('room.delete',jsonb_build_object('id',(select id from fixtures where kind='shared')));
select is((select count(*) from public.saved_study_rooms where room_id=(select id from fixtures where kind='shared')),0::bigint,'Creator deletion clears the creator saved record');
select set_config('request.jwt.claims','{"sub":"80000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.saved_study_rooms where room_id=(select id from fixtures where kind='shared')),0::bigint,'Creator deletion clears guest saved records too');
select is(public.community_read('room',jsonb_build_object('id',(select id from fixtures where kind='shared')))->'context'->'deleted','true'::jsonb,'Deleted room links still explain deletion');
reset role;
select is((select count(*) from public.saved_study_rooms where room_id=(select id from fixtures where kind='shared')),0::bigint,'No other saved records remain after deletion');
select throws_ok($$insert into public.saved_study_rooms(user_id,room_id) values('80000000-0000-4000-8000-000000000002',(select id from fixtures where kind='temporary'))$$,'42501',null,'Database guard rejects saving temporary rooms even through a privileged insert');
select * from finish();
rollback;
