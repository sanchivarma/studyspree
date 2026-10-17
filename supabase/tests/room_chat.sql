begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(17);
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values
('72000000-0000-4000-8000-000000000001','chat-a@example.test','{"provider":"email"}','{"username":"chat_a"}'),
('72000000-0000-4000-8000-000000000002','chat-b@example.test','{"provider":"email"}','{"username":"chat_b"}');
insert into public.study_rooms(id,owner_id,name) values('72000000-0000-4000-8000-000000000010','72000000-0000-4000-8000-000000000001','Chat fixture');
select ok((select relrowsecurity from pg_class where oid='public.room_chat_messages'::regclass),'Chat table has RLS');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"72000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.read_room_chat('72000000-0000-4000-8000-000000000010')$$,'42501',null,'A non-participant cannot read room chat');
select lives_ok($$select public.join_room_with_goal('72000000-0000-4000-8000-000000000010','Read chapter three')$$,'Joining posts a goal');
select is((select count(*) from public.room_chat_messages where kind='goal'),1::bigint,'One goal is posted');
select public.join_room_with_goal('72000000-0000-4000-8000-000000000010','Read chapter three');
select is((select count(*) from public.room_chat_messages where kind='goal'),1::bigint,'Repeated Join never duplicates the goal');
select lives_ok($$select public.send_room_chat('72000000-0000-4000-8000-000000000010','Hi everyone','72000000-0000-4000-8000-000000000020')$$,'Participant can say hi');
select public.send_room_chat('72000000-0000-4000-8000-000000000010','Hi everyone','72000000-0000-4000-8000-000000000020');
select is((select count(*) from public.room_chat_messages where kind='message'),1::bigint,'Retry is idempotent');
select throws_ok($$insert into public.room_chat_messages(room_id,author_id,body,client_id) values('72000000-0000-4000-8000-000000000010',auth.uid(),'Spoof','72000000-0000-4000-8000-000000000021')$$,'42501',null,'Direct writes cannot spoof authors or goal messages');
select set_config('request.jwt.claims','{"sub":"72000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.room_chat_messages),0::bigint,'RLS hides chat from non-participants');
select throws_ok($$select public.read_room_chat('72000000-0000-4000-8000-000000000010')$$,'42501',null,'Public room discovery does not grant chat access');
select lives_ok($$select public.join_room_with_goal('72000000-0000-4000-8000-000000000010','')$$,'Blank goal allows joining without announcement');
select is(jsonb_array_length(public.read_room_chat('72000000-0000-4000-8000-000000000010')->'items'),2,'Joined second account can read the goal and greeting');
select throws_ok($$select public.send_room_chat('72000000-0000-4000-8000-000000000010','  ','72000000-0000-4000-8000-000000000022')$$,'22023',null,'Empty messages are rejected');
select public.community_mutate('room.leave','{"id":"72000000-0000-4000-8000-000000000010"}');
select throws_ok($$select public.read_room_chat('72000000-0000-4000-8000-000000000010')$$,'42501',null,'Leaving revokes chat reads');
select throws_ok($$select public.send_room_chat('72000000-0000-4000-8000-000000000010','Hi','72000000-0000-4000-8000-000000000023')$$,'42501',null,'Leaving revokes chat sends');
select public.join_room_with_goal('72000000-0000-4000-8000-000000000010','');
do $$begin for i in 1..20 loop perform public.send_room_chat('72000000-0000-4000-8000-000000000010','Hello',gen_random_uuid());end loop;end;$$;
select throws_ok($$select public.send_room_chat('72000000-0000-4000-8000-000000000010','More','72000000-0000-4000-8000-000000000024')$$,'P0001',null,'Database enforces the message rate limit');
select public.community_mutate('block.set','{"targetId":"72000000-0000-4000-8000-000000000001","value":true}');
-- Blocking closes the blocker's visit; even direct reads are immediately revoked.
select is((select count(*) from public.room_chat_messages),0::bigint,'Blocking closes presence and revokes chat access');
reset role;
select * from finish();
rollback;
