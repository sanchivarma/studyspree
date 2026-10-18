begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(5);
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values
('a8570000-0000-4000-8000-000000000001','reaction-a@example.test','{"provider":"email"}','{"username":"reaction_a"}');
insert into feed_posts(id,author_id,body) values('a8570000-0000-4000-8000-000000000002','a8570000-0000-4000-8000-000000000001','Snapshot fixture');
insert into post_reactions(user_id,post_id,emoji) values('a8570000-0000-4000-8000-000000000001','a8570000-0000-4000-8000-000000000002','heart');
update post_reaction_intervals set started_at=now()-interval '2 minutes' where post_id='a8570000-0000-4000-8000-000000000002';
select is(auth_private.popularity_score('a8570000-0000-4000-8000-000000000002',now()-interval '1 minute'),1::bigint,'Reaction contributes at snapshot');
delete from post_reactions where post_id='a8570000-0000-4000-8000-000000000002';
select is(auth_private.popularity_score('a8570000-0000-4000-8000-000000000002',now()-interval '1 minute'),1::bigint,'Later removal preserves old cursor score');
select is(auth_private.popularity_score('a8570000-0000-4000-8000-000000000002',now()),0::bigint,'Removal updates current score');
insert into post_reactions(user_id,post_id,emoji) values('a8570000-0000-4000-8000-000000000001','a8570000-0000-4000-8000-000000000002','support');
select is(auth_private.popularity_score('a8570000-0000-4000-8000-000000000002',now()),1::bigint,'Re-adding cannot multiply current score');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a8570000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select * from post_reaction_intervals$$,'42501',null,'Private reaction history cannot be fetched directly');
select * from finish();rollback;
