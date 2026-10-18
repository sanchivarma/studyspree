begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(7);
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values
('a8560000-0000-4000-8000-000000000001','rank-a@example.test','{"provider":"email"}','{"username":"rank_a"}'),
('a8560000-0000-4000-8000-000000000002','rank-b@example.test','{"provider":"email"}','{"username":"rank_b"}');
update profiles set leaderboard_opt_in=true where id in('a8560000-0000-4000-8000-000000000001','a8560000-0000-4000-8000-000000000002');
select set_config('test.rank_stamp',(now()-interval '1 microsecond')::text,true);
insert into leaderboard_snapshots(snapshot_at,metric,period,user_id,score,rank) values
(current_setting('test.rank_stamp')::timestamptz,'streak','all','a8560000-0000-4000-8000-000000000001',7,1),
(current_setting('test.rank_stamp')::timestamptz,'streak','all','a8560000-0000-4000-8000-000000000002',7,2);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a8560000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('test.rank_page',community_leaderboard_page('streak','all',1,jsonb_build_object('snapshotAt',current_setting('test.rank_stamp'),'afterRank',0,'metric','streak','period','all'))::text,true);
select is(jsonb_array_length(current_setting('test.rank_page')::jsonb->'items'),1,'Requested page size respected');
select is(current_setting('test.rank_page')::jsonb->'items'->0->>'id','a8560000-0000-4000-8000-000000000001','Ties retain trusted stable rank');
select is((current_setting('test.rank_page')::jsonb->>'nextCursor')::jsonb->>'afterRank','1','Cursor records last rank');
select is(community_leaderboard_page('streak','all',1,(current_setting('test.rank_page')::jsonb->>'nextCursor')::jsonb)->'items'->0->>'id','a8560000-0000-4000-8000-000000000002','Next page does not repeat a tie');
select throws_ok($$select community_leaderboard_page('time','all',1,(current_setting('test.rank_page')::jsonb->>'nextCursor')::jsonb)$$,'22023',null,'Cursor cannot cross metric filters');
select throws_ok($$select community_leaderboard_page('streak','all',null,null)$$,'22023',null,'Null limit cannot bypass page bound');
update profiles set leaderboard_opt_in=false where id=auth.uid();
select is(community_leaderboard_page('streak','all',1,(current_setting('test.rank_page')::jsonb->>'nextCursor')::jsonb)->'items'->0->>'id','a8560000-0000-4000-8000-000000000002','Revoked consent does not shift the next keyset page');
select * from finish();rollback;
