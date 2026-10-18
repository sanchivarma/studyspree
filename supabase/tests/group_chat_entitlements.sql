begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(5);
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values
('a8700000-0000-4000-8000-000000000001','chat-ent-a@example.test','{"provider":"email"}','{"username":"chat_ent_a"}'),
('a8700000-0000-4000-8000-000000000002','chat-ent-b@example.test','{"provider":"email"}','{"username":"chat_ent_b"}');
insert into conversation_threads(id,owner_id,kind,title) values
('a8700000-0000-4000-8000-000000000003','a8700000-0000-4000-8000-000000000001','group','Test group chat'),
('a8700000-0000-4000-8000-000000000004','a8700000-0000-4000-8000-000000000001','direct','Test direct chat');
insert into thread_members(thread_id,user_id) values
('a8700000-0000-4000-8000-000000000003','a8700000-0000-4000-8000-000000000001'),
('a8700000-0000-4000-8000-000000000003','a8700000-0000-4000-8000-000000000002'),
('a8700000-0000-4000-8000-000000000004','a8700000-0000-4000-8000-000000000001');
insert into chat_messages(thread_id,author_id,body,client_id) values
('a8700000-0000-4000-8000-000000000003','a8700000-0000-4000-8000-000000000002','A private group message',gen_random_uuid());
insert into feature_entitlements(user_id,feature_key,enabled,valid_until) values
('a8700000-0000-4000-8000-000000000001','group-chat',true,now()-interval '1 hour');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a8700000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*) from chat_messages where thread_id='a8700000-0000-4000-8000-000000000003'),0::bigint,'Expired group chat is hidden by the Realtime SELECT policy');
select throws_ok($$select public.community_mutate('message.send','{"id":"a8700000-0000-4000-8000-000000000003","body":"Denied","clientId":"a8700000-0000-4000-8000-000000000009"}')$$,'42501',null,'Expired group chat cannot send');
select ok(auth_private.can_read_thread('a8700000-0000-4000-8000-000000000004',auth.uid()),'Direct chats are independent of group-chat entitlement');
select set_config('request.jwt.claims','{"sub":"a8700000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from chat_messages where thread_id='a8700000-0000-4000-8000-000000000003'),1::bigint,'Unconfigured group-chat quota does not invent restrictions');
select lives_ok($$select public.community_mutate('message.send','{"id":"a8700000-0000-4000-8000-000000000003","body":"Allowed","clientId":"a8700000-0000-4000-8000-000000000008"}')$$,'Eligible member can send');
reset role;
select * from finish();
rollback;
