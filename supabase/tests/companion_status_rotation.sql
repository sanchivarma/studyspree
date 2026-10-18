begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(5);
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values
('b3500000-0000-4000-8000-000000000001','rotation-a@example.test','{"provider":"email"}','{}'),
('b3500000-0000-4000-8000-000000000002','rotation-b@example.test','{"provider":"email"}','{}');
insert into sessions(id,user_id,started_at,planned_minutes,theme_slug,companions,companion_status_cycle) values
('b3500000-0000-4000-8000-000000000011','b3500000-0000-4000-8000-000000000001',clock_timestamp()-interval '20 seconds',5,'rain-desk','{"mode":"solo","characterSlugs":[]}',999);
select is((select companion_status_cycle from sessions where id='b3500000-0000-4000-8000-000000000011'),0::bigint,'First cycle is assigned by the server');
update sessions set ended_at=started_at+interval '10 seconds',ended_reason='stopped_early' where id='b3500000-0000-4000-8000-000000000011';
insert into sessions(id,user_id,started_at,planned_minutes,theme_slug,companions) values
('b3500000-0000-4000-8000-000000000012','b3500000-0000-4000-8000-000000000001',now()-interval '1 second',5,'rain-desk','{"mode":"solo","characterSlugs":[]}'),
('b3500000-0000-4000-8000-000000000013','b3500000-0000-4000-8000-000000000002',now()-interval '1 second',5,'rain-desk','{"mode":"solo","characterSlugs":[]}');
select is((select companion_status_cycle from sessions where id='b3500000-0000-4000-8000-000000000012'),1::bigint,'New session advances rotation');
select is((select companion_status_cycle from sessions where id='b3500000-0000-4000-8000-000000000013'),0::bigint,'Other accounts have independent rotation');
select throws_ok($$update sessions set companion_status_cycle=99 where id='b3500000-0000-4000-8000-000000000012'$$,'23514',null,'A session rotation cannot be rewritten');
select is((select total_seconds from day_stats where user_id='b3500000-0000-4000-8000-000000000001'),10::bigint,'Rotation does not change timestamp-derived banked time');
select * from finish();
rollback;
