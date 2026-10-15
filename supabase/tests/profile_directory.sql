begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public,extensions;
select plan(22);
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values
('30000000-0000-4000-8000-000000000001','profile-a@example.test','{"provider":"email"}','{"username":"profile_a"}'),
('30000000-0000-4000-8000-000000000002','profile-b@example.test','{"provider":"email"}','{"username":"profile_b"}');
select is((select count(*) from public.profile_cards where user_id in ('30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002')),2::bigint,'New users get profile cards');
select ok((select relrowsecurity from pg_class where oid='public.profile_cards'::regclass),'Profile cards have RLS');
select ok((select relrowsecurity from pg_class where oid='public.profile_follows'::regclass),'Follows have RLS');
select ok(not (select public from storage.buckets where id='profile-media'),'Photos use a private bucket');

insert into storage.objects(bucket_id,name) values ('profile-media','30000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000001.png');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select ok(not (select is_public from public.profile_cards where user_id=auth.uid()),'Profiles start private');
select ok(public.read_visible_profile('profile_a') is not null,'Owner can read own private profile');
select throws_ok($$update public.profile_cards set user_id='30000000-0000-4000-8000-000000000002' where user_id=auth.uid()$$,'42501',null,'Owner cannot change identity');
update public.profile_cards set display_name='Study A', bio='Reading',avatar_path='30000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000001.png' where user_id=auth.uid();
select is((select display_name from public.profiles where id=auth.uid()),'Study A','Profile name updates the account greeting');
select throws_ok($$update public.profile_cards set socials='[{"label":"x","url":"javascript:alert(1)"}]' where user_id=auth.uid()$$,'23514',null,'Database rejects unsafe links');
select throws_ok($$update public.profile_cards set avatar_path='30000000-0000-4000-8000-000000000002/40000000-0000-4000-8000-000000000001.png' where user_id=auth.uid()$$,'23514',null,'Cannot attach another owners image');
update public.profile_cards set is_public=true where user_id=auth.uid();
select throws_ok($$insert into public.profile_follows(follower_id,following_id) values(auth.uid(),auth.uid())$$,'23514',null,'Self-follow is rejected');
update public.profile_cards set is_public=false where user_id=auth.uid();

select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select ok(public.read_visible_profile('profile_a') is null,'Another user cannot read a private profile');
select is((select count(*) from storage.objects where bucket_id='profile-media'),0::bigint,'Private photo is hidden from another user');
with changed as (update public.profile_cards set bio='Tampered' where user_id='30000000-0000-4000-8000-000000000001' returning user_id)
select is((select count(*) from changed),0::bigint,'Cross-user editing is blocked');
select throws_ok($$insert into public.profile_follows(follower_id,following_id) values(auth.uid(),'30000000-0000-4000-8000-000000000001')$$,'42501',null,'Cannot follow a private profile');

select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
update public.profile_cards set is_public=true where user_id=auth.uid();
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is(public.read_visible_profile('profile_a')->>'displayName','Study A','Public projection is visible');
select ok(not (public.read_visible_profile('profile_a') ?| array['email','first_name','timezone','webcam_enabled','is_public']),'Public projection excludes account details and preferences');
select is((select count(*) from storage.objects where bucket_id='profile-media'),1::bigint,'Attached public photo is visible');
insert into public.profile_follows(follower_id,following_id) values(auth.uid(),'30000000-0000-4000-8000-000000000001');
select is((public.read_visible_profile('profile_a')->>'followers')::int,1,'Follow count comes from real relationships');
select throws_ok($$insert into public.profile_follows(follower_id,following_id) values(auth.uid(),'30000000-0000-4000-8000-000000000001')$$,'23505',null,'Duplicate follow cannot inflate counts');
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
update public.profile_cards set is_public=false where user_id=auth.uid();
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select ok(public.read_visible_profile('profile_a') is null,'Turning visibility off revokes profile access');
select is((select count(*) from storage.objects where bucket_id='profile-media'),0::bigint,'Turning visibility off revokes photo access');
reset role;
select * from finish();
rollback;
