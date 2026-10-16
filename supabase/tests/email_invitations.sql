begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values
('82000000-0000-4000-8000-000000000001','email-a@example.test','{"provider":"email"}','{"username":"email_a"}'),
('82000000-0000-4000-8000-000000000002','email-b@example.test','{"provider":"email"}','{"username":"email_b"}');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"82000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select ok(public.reserve_email_invitation('83000000-0000-4000-8000-000000000001',repeat('a',64)),'Account can reserve an invitation');
select ok(not public.reserve_email_invitation('83000000-0000-4000-8000-000000000001',repeat('a',64)),'Retry does not reserve a duplicate');
select throws_ok($$insert into public.email_invitation_reservations(id,user_id,recipient_hash) values(gen_random_uuid(),auth.uid(),repeat('a',64))$$,'42501',null,'Clients cannot bypass invitation reservations');
select throws_ok($$select public.reserve_email_invitation(gen_random_uuid(),'not-a-hash')$$,'22023','Invalid invitation','Recipient input must be hashed');
select public.reserve_email_invitation(gen_random_uuid(),repeat('b',64)) from generate_series(1,4);
select throws_ok($$select public.reserve_email_invitation(gen_random_uuid(),repeat('c',64))$$,'P0001','Invitation limit reached','Hourly mail limit enforced atomically');
select set_config('request.jwt.claims','{"sub":"82000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*)::integer from public.email_invitation_reservations),0,'Email reservations are private to their sender');
select ok(public.reserve_email_invitation(gen_random_uuid(),repeat('d',64)),'Other accounts have independent limits');
select set_config('request.jwt.claims','{}',true);
select throws_ok($$select public.reserve_email_invitation(gen_random_uuid(),repeat('e',64))$$,'42501','Not authorized','Signed-out sender rejected');
select * from finish();
rollback;
