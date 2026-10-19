begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(13);
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values
('a8630000-0000-4000-8000-000000000001','solo-a@example.test','{"provider":"email"}','{"username":"solo_a"}'),
('a8630000-0000-4000-8000-000000000002','solo-b@example.test','{"provider":"email"}','{"username":"solo_b"}');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a8630000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select solo_scene from profiles where id=auth.uid()),'{"desk":"modern","window":"sea"}'::jsonb,'Old and new profiles have a default POV');
select lives_ok($$update profiles set solo_scene='{"desk":"medieval","window":"magic-academy"}' where id=auth.uid()$$,'Owner can select independent desk and window');
select lives_ok($$update profiles set solo_scene='{"desk":"space-shuttle","window":"waterfall"}' where id=auth.uid()$$,'Fantasy view remains independent of desk');
select throws_ok($$update profiles set solo_scene='{"desk":"unknown","window":"sea"}' where id=auth.uid()$$,'23514',null,'Unknown desk rejected');
select throws_ok($$update profiles set solo_scene='{"desk":"modern","window":"unknown"}' where id=auth.uid()$$,'23514',null,'Unknown window rejected');
select throws_ok($$update profiles set solo_scene='{"desk":null,"window":"sea"}' where id=auth.uid()$$,'23514',null,'JSON null rejected');
select throws_ok($$update profiles set solo_scene='{"desk":"modern","window":"sea","extra":true}' where id=auth.uid()$$,'23514',null,'Unrecognised field rejected');
update profiles set solo_scene='{"desk":"pirate","window":"sea"}' where id='a8630000-0000-4000-8000-000000000002';
reset role;
select is((select solo_scene from profiles where id='a8630000-0000-4000-8000-000000000002'),'{"desk":"modern","window":"sea"}'::jsonb,'Owner cannot edit someone else scene');
set local role authenticated;
select throws_ok($$update profiles set solo_scene='{"desk":"modern","window":"green-nature"}' where id=auth.uid()$$,'23514',null,'Retired Green Nature rejected');
select throws_ok($$update profiles set solo_scene='{"desk":"modern","window":"rivendell"}' where id=auth.uid()$$,'23514',null,'Old Waterfall name rejected');
select throws_ok($$update profiles set solo_scene='{"desk":"modern","window":"clouds"}' where id=auth.uid()$$,'23514',null,'Moving Clouds retired');
select throws_ok($$update profiles set solo_scene='{"desk":"sherlock","window":"sea"}' where id=auth.uid()$$,'23514',null,'Sherlock table retired');
select throws_ok($$update profiles set solo_scene='{"desk":"pirate","window":"blackhole"}' where id=auth.uid()$$,'23514',null,'Black Hole retired');
select * from finish();
rollback;
