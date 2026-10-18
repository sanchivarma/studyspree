begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(5);
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values
('a8800000-0000-4000-8000-000000000001','thread-a@example.test','{"provider":"email"}','{"username":"thread_a"}'),
('a8800000-0000-4000-8000-000000000002','thread-b@example.test','{"provider":"email"}','{"username":"thread_b"}');
insert into conversation_threads(id,owner_id,kind,title) values
('a8800000-0000-4000-8000-000000000003','a8800000-0000-4000-8000-000000000001','direct','Accessible conversation'),
('a8800000-0000-4000-8000-000000000004','a8800000-0000-4000-8000-000000000002','direct','Other conversation');
insert into thread_members(thread_id,user_id) values
('a8800000-0000-4000-8000-000000000003','a8800000-0000-4000-8000-000000000001'),
('a8800000-0000-4000-8000-000000000004','a8800000-0000-4000-8000-000000000002');
insert into chat_messages(id,thread_id,author_id,body,client_id) values
('a8800000-0000-4000-8000-000000000005','a8800000-0000-4000-8000-000000000003','a8800000-0000-4000-8000-000000000001','Parent',gen_random_uuid()),
('a8800000-0000-4000-8000-000000000006','a8800000-0000-4000-8000-000000000004','a8800000-0000-4000-8000-000000000002','Private parent',gen_random_uuid());
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a8800000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.community_mutate('message.send','{"id":"a8800000-0000-4000-8000-000000000003","parentId":"a8800000-0000-4000-8000-000000000005","body":"A reply","clientId":"a8800000-0000-4000-8000-000000000007"}');
select public.community_mutate('message.send','{"id":"a8800000-0000-4000-8000-000000000003","parentId":"a8800000-0000-4000-8000-000000000005","body":"A reply","clientId":"a8800000-0000-4000-8000-000000000007"}');
select is(jsonb_array_length(public.community_read('messages','{"id":"a8800000-0000-4000-8000-000000000003","parentId":"a8800000-0000-4000-8000-000000000005"}')->'items'),1,'Thread returns its reply once across a send retry');
select is(public.community_read('messages','{"id":"a8800000-0000-4000-8000-000000000003","parentId":"a8800000-0000-4000-8000-000000000005"}')->'items'->0->>'body','A reply','Thread does not return unrelated conversation messages');
select throws_ok($$select public.community_read('messages','{"id":"a8800000-0000-4000-8000-000000000003","parentId":"a8800000-0000-4000-8000-000000000006"}')$$,'42501',null,'Cross-conversation parent read is denied');
select throws_ok($$select public.community_mutate('message.send','{"id":"a8800000-0000-4000-8000-000000000003","parentId":"a8800000-0000-4000-8000-000000000006","body":"Denied","clientId":"a8800000-0000-4000-8000-000000000008"}')$$,'22023',null,'Cross-conversation reply write is denied');
select set_config('request.jwt.claims','{"sub":"a8800000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select public.community_read('messages','{"id":"a8800000-0000-4000-8000-000000000003","parentId":"a8800000-0000-4000-8000-000000000005"}')$$,'42501',null,'Private thread denies another account');
reset role;
select * from finish();
rollback;
