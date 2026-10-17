begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public,extensions;
select plan(5);
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values
('71000000-0000-4000-8000-000000000001','ambience@example.test','{"provider":"email"}','{"username":"ambience_fixture"}');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select lives_ok($$update public.profiles set music_track='still-water' where id=auth.uid()$$,'Owner can select original ambient music');
select is((select music_track from public.profiles where id=auth.uid()),'still-water','Original track persists');
select lives_ok($$update public.profiles set music_track='silent' where id=auth.uid()$$,'Existing silent preference remains valid');
select lives_ok($$update public.profiles set music_track=null where id=auth.uid()$$,'Music can remain off');
select throws_ok($$update public.profiles set music_track='unlicensed-track' where id=auth.uid()$$,'23514',null,'Unknown tracks are rejected by the database');
reset role;
select * from finish();
rollback;
