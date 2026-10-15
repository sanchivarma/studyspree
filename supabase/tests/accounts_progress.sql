begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(14);

insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values
('10000000-0000-4000-8000-000000000001','account-a@example.test','{"provider":"email"}','{}'),
('10000000-0000-4000-8000-000000000002','account-b@example.test','{"provider":"email"}','{}');

select is((select count(*) from public.profiles where id in ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002')),2::bigint,'Magic-link accounts get profiles');
select is((select count(*) from public.streaks where user_id in ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002')),2::bigint,'New accounts get streak rows');
select ok((select relrowsecurity from pg_class where oid='public.sessions'::regclass),'Sessions have RLS');
select ok((select relrowsecurity from pg_class where oid='public.day_stats'::regclass),'Day totals have RLS');
select ok((select relrowsecurity from pg_class where oid='public.streaks'::regclass),'Streaks have RLS');

insert into public.sessions(id,user_id,started_at,planned_minutes,theme_slug,companions) values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',clock_timestamp()-interval '20 seconds',5,'rain-desk','{"mode":"characters","characterSlugs":["male-01","female-04"]}'),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002',clock_timestamp()-interval '10 seconds',5,'night-shift','{"mode":"solo","characterSlugs":[]}');
update public.sessions set ended_at=started_at+interval '8 seconds',ended_reason='stopped_early' where id='20000000-0000-4000-8000-000000000001';
select is((select actual_seconds from public.sessions where id='20000000-0000-4000-8000-000000000001'),8,'Trigger computes banked seconds');
select is((select total_seconds from public.day_stats where user_id='10000000-0000-4000-8000-000000000001'),8::bigint,'Ending credits day totals');
select throws_ok($$update public.day_stats set total_seconds=0 where user_id='10000000-0000-4000-8000-000000000001'$$,'23514',null,'Even trusted updates cannot lower banked time');
select throws_ok($$update public.sessions set companions='{"mode":"solo","characterSlugs":[]}' where id='20000000-0000-4000-8000-000000000001'$$,'23514',null,'Ended companion snapshots cannot change');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*) from public.sessions),1::bigint,'User A sees its own session');
select throws_ok($$update public.day_stats set total_seconds=100$$,'42501',null,'Users cannot directly write day totals');
update public.profiles set companion_preferences='{"mode":"characters","characterSlugs":["female-02"]}' where id='10000000-0000-4000-8000-000000000001';
select is((select companion_preferences->'characterSlugs'->>0 from public.profiles),'female-02','Owner can save companion preferences');
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.sessions where user_id='10000000-0000-4000-8000-000000000001'),0::bigint,'User B cannot read user A sessions');
select is((select count(*) from public.day_stats),0::bigint,'User B cannot read user A banked totals');
reset role;
select * from finish();
rollback;
