begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(8);
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values
('a8550000-0000-4000-8000-000000000001','patch-a@example.test','{"provider":"email"}','{"username":"patch_a"}'),
('a8550000-0000-4000-8000-000000000002','patch-b@example.test','{"provider":"email"}','{"username":"patch_b"}');
insert into study_tasks(id,user_id,title,due_date,position) values('a8550000-0000-4000-8000-000000000003','a8550000-0000-4000-8000-000000000001','Read chapter','2026-10-18',7);
insert into study_groups(id,owner_id,name,description) values('a8550000-0000-4000-8000-000000000004','a8550000-0000-4000-8000-000000000001','Study group','Keep this description');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a8550000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select lives_ok($$select community_patch('tasks','a8550000-0000-4000-8000-000000000003','{"title":"Read two chapters","done":true}')$$,'Partial task edits and completion are atomic');
select is((select due_date::text from study_tasks where id='a8550000-0000-4000-8000-000000000003'),'2026-10-18','Omitted saved date preserved');
select is((select position from study_tasks where id='a8550000-0000-4000-8000-000000000003'),7,'Omitted position preserved');
select ok((select is_done from study_tasks where id='a8550000-0000-4000-8000-000000000003'),'Completion applied with title');
select lives_ok($$select community_patch('groups','a8550000-0000-4000-8000-000000000004','{"title":"Renamed group"}')$$,'Partial group edit accepted');
select is((select description from study_groups where id='a8550000-0000-4000-8000-000000000004'),'Keep this description','Omitted group description preserved');
select throws_ok($$select community_patch('tasks','a8550000-0000-4000-8000-000000000003','{"elapsed":42}')$$,'22023',null,'Unknown accounting fields rejected');
select set_config('request.jwt.claims','{"sub":"a8550000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select community_patch('tasks','a8550000-0000-4000-8000-000000000003','{"title":"Other owner"}')$$,'42501',null,'Other owners cannot patch');
select * from finish();
rollback;
