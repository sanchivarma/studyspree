begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(6);
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values
('a8610000-0000-4000-8000-000000000001','piano@example.test','{"provider":"email"}','{"username":"piano_test"}');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a8610000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select lives_ok($$update profiles set background_effects='["piano-nocturne","piano-gymnopedie","piano-moonlight"]',effect_volumes='{"piano-nocturne":0.25,"piano-gymnopedie":0.4,"piano-moonlight":0.6}' where id=auth.uid()$$,'Owner can save three piano choices and separate levels');
select is((select effect_volumes->>'piano-nocturne' from profiles where id=auth.uid()),'0.25','Piano level retained');
select throws_ok($$update profiles set background_effects='["piano-nocturne","piano-nocturne"]' where id=auth.uid()$$,'23514',null,'Duplicate piano choices rejected');
select throws_ok($$update profiles set effect_volumes='{"piano-moonlight":1.1}' where id=auth.uid()$$,'23514',null,'Piano volume remains bounded');
reset role;
select ok(auth_private.valid_room_controls('{"themeSlug":"rain-desk","characterSlugs":[],"audio":{"musicTrack":null,"musicVolume":0,"roomVolume":0.4,"backgroundEffects":["piano-nocturne","piano-gymnopedie","piano-moonlight"],"effectVolumes":{"piano-nocturne":0.25}}}'::jsonb),'Shared controls accept the same piano choices');
select ok(not auth_private.valid_room_controls('{"themeSlug":"rain-desk","characterSlugs":[],"audio":{"musicTrack":null,"musicVolume":0,"roomVolume":0.4,"backgroundEffects":["piano-nocturne","piano-nocturne"],"effectVolumes":{}}}'::jsonb),'Shared controls reject duplicate piano choices');
select * from finish();
rollback;
