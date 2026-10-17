begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(9);
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values
('85000000-0000-4000-8000-000000000001','public-host@example.test','{"provider":"email"}','{"username":"public_host"}'),
('85000000-0000-4000-8000-000000000002','private-host@example.test','{"provider":"email"}','{"username":"private_host"}');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"85000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('test.public',(public.start_session_with_details(25,'rain-desk',null,'{"mode":"characters","characterSlugs":["male-01"]}','Read together','Please keep camera audio off.','public')).id::text,true);
select is((select title from public.sessions where id=current_setting('test.public')::uuid),'Read together','Session title is stored separately from the optional goal');
select ok((select room_id is not null from public.sessions where id=current_setting('test.public')::uuid),'Public Start creates a real joining room');
select is((select count(*) from public.sessions where user_id=auth.uid()),1::bigint,'Creating a public room never creates a second timer');
select is((public.start_session_with_details(5,'space',null,'{"mode":"solo","characterSlugs":[]}','Other title',null,'private')).id::text,current_setting('test.public'),'Double Start returns the same session');
select set_config('request.jwt.claims','{"sub":"85000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select set_config('test.private',(public.start_session_with_details(5,'space',null,'{"mode":"solo","characterSlugs":[]}','Private reading','No interruptions.','private')).id::text,true);
select is((select count(*) from jsonb_array_elements(public.community_read('publicSessions')->'items') item where item->'data'->>'sessionId'=current_setting('test.public')),1::bigint,'Another account sees the running public session on Home');
select is((select count(*) from jsonb_array_elements(public.community_read('publicSessions')->'items') item where item->'data'->>'sessionId'=current_setting('test.private')),0::bigint,'Private session never appears in public listing');
select set_config('test.invite',public.calendar_mutate('session.share',jsonb_build_object('id',current_setting('test.private')))->>'token',true);
select ok(length(current_setting('test.invite'))=64,'Explicit private sharing creates a real invitation token');
select set_config('request.jwt.claims','{"sub":"85000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select lives_ok($$select public.community_mutate('invite.accept',jsonb_build_object('token',current_setting('test.invite')))$$,'Invitation grants membership to the private joining URL');
select public.finish_study_session(current_setting('test.public')::uuid,'stopped_early');
select is((select count(*) from jsonb_array_elements(public.community_read('publicSessions')->'items') item where item->'data'->>'sessionId'=current_setting('test.public')),0::bigint,'Finished sessions leave the public Home directory');
reset role;
select * from finish();
rollback;
