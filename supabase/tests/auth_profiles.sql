-- Run against a local Supabase test database after applying the migration.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(7);

insert into auth.users(id, email, raw_app_meta_data, raw_user_meta_data)
values ('00000000-0000-4000-8000-000000000001', 'fixture@example.test', '{"provider":"email"}', '{"username":"fixture_user"}');
insert into auth_private.login_config(singleton, secret_hash)
values (true, encode(extensions.digest('test-only-secret-0000000000000000000000', 'sha256'), 'hex'))
on conflict(singleton) do update set secret_hash = excluded.secret_hash;

select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), 'Profile RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'auth_private.login_config'::regclass), 'Secret table RLS enabled');
select throws_ok($$select public.lookup_login_email('fixture_user', 'incorrect')$$, '42501', 'Not authorized', 'Incorrect lookup secret denied');
select is(public.lookup_login_email('fixture_user', 'test-only-secret-0000000000000000000000'), 'fixture@example.test', 'Verified server lookup resolves email');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.profiles), 1::bigint, 'User can read own profile');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*) from public.profiles), 0::bigint, 'Another user cannot read profile');
select throws_ok($$update public.profiles set username = 'changed'$$, '42501', 'permission denied for table profiles', 'Profile writes denied');
reset role;
select * from finish();
rollback;
