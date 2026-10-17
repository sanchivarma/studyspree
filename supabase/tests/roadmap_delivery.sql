begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(10);
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values
('81000000-0000-4000-8000-000000000001','roadmap-a@example.test','{"provider":"email"}','{"username":"roadmap_a"}'),
('81000000-0000-4000-8000-000000000002','roadmap-b@example.test','{"provider":"email"}','{"username":"roadmap_b"}');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"81000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((public.community_read('preferences')->'context'->>'sharePresence')::boolean,false,'Presence announcements require explicit subject consent');
select public.community_mutate('post.create','{"body":"A real update","clientId":"81000000-0000-4000-8000-000000000003"}');
select public.community_mutate('post.create','{"body":"A real update","clientId":"81000000-0000-4000-8000-000000000003"}');
select is((select count(*) from public.feed_posts where author_id=auth.uid()),1::bigint,'Publication retry never duplicates a post');
select public.update_personal_tile('{"status":"Read chapter 1"}');
select public.update_personal_tile('{"status":"Read chapter 1"}');
select is(jsonb_array_length(public.read_tile_history()->'items'),1,'Posting current status is idempotent');
select public.update_personal_tile('{"status":""}');
select is(jsonb_array_length(public.read_tile_history()->'items'),2,'Clearing appends an event');
select throws_ok($$update public.profiles set personal_tile='{"mirrored":true,"isVisible":true,"status":"spoof","history":[]}' where id=auth.uid()$$,'42501',null,'Client cannot replace history');
select throws_ok($$insert into public.profile_status_events(user_id,text) values(auth.uid(),'Spoof')$$,'42501',null,'Direct event insertion denied');
select throws_ok($$insert into public.user_achievements(user_id,achievement_id) values(auth.uid(),'sessions-100')$$,'42501',null,'Clients cannot mint awards');
select set_config('request.jwt.claims','{"sub":"81000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is(jsonb_array_length(public.read_tile_history()->'items'),0,'Status history is private');
select is((select count(*) from public.profile_status_events),0::bigint,'Event RLS isolates accounts');
select is(jsonb_array_length(public.read_character_history()),0,'Character history never invents time');
reset role;
select * from finish();
rollback;
