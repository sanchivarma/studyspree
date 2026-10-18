begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(16);
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values
('a8500000-0000-4000-8000-000000000001','audio-a@example.test','{"provider":"email"}','{"username":"audio_a"}'),
('a8500000-0000-4000-8000-000000000002','audio-b@example.test','{"provider":"email"}','{"username":"audio_b"}');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a8500000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select background_effects from profiles where id=auth.uid()),'[]'::jsonb,'New accounts select no effects');
select lives_ok($$update profiles set background_effects='["rain","wind"]',room_volume=0.4,music_track='radio:lofi-studying' where id=auth.uid()$$,'Owner can persist effects and radio ID');
select throws_ok($$update profiles set background_effects='["unknown"]' where id=auth.uid()$$,'23514',null,'Unknown effect rejected');
select throws_ok($$update profiles set background_effects='["rain","rain"]' where id=auth.uid()$$,'23514',null,'Duplicate effect rejected');
select throws_ok($$update profiles set music_track='https://untrusted.test/stream' where id=auth.uid()$$,'23514',null,'Arbitrary stream URLs cannot be saved');
select lives_ok($$update profiles set effect_volumes='{"rain":0.75,"wind":0.2}' where id=auth.uid()$$,'Independent effect levels can be saved');
select throws_ok($$update profiles set effect_volumes='{"rain":2}' where id=auth.uid()$$,'23514',null,'Effect volume range enforced');
select throws_ok($$update profiles set effect_volumes='{"unknown":0.5}' where id=auth.uid()$$,'23514',null,'Effect volume keys enforced');
select lives_ok($$update profiles set background_effects='["ocean","library","castle"]',effect_volumes='{"ocean":0.2,"library":0.7,"castle":0.4}' where id=auth.uid()$$,'Owner can save the expanded ambience mix');
select is((select effect_volumes->>'castle' from profiles where id=auth.uid()),'0.4','Castle volume is retained');
select throws_ok($$update profiles set background_effects='["castle","castle"]' where id=auth.uid()$$,'23514',null,'New effects still reject duplicate selections');
select throws_ok($$update profiles set effect_volumes='{"library":-0.1}' where id=auth.uid()$$,'23514',null,'New effect volumes retain their range checks');
select throws_ok($$update profiles set background_effects='["medieval"]' where id=auth.uid()$$,'23514',null,'Retired medieval selections rejected');
select throws_ok($$update profiles set effect_volumes='{"medieval-flute":0.5}' where id=auth.uid()$$,'23514',null,'Retired effect volumes rejected');
select is((select effect_volumes->>'ocean' from profiles where id=auth.uid()),'0.2','Ocean level is retained');
update profiles set background_effects='["wind"]' where id='a8500000-0000-4000-8000-000000000002';
reset role;
select is((select background_effects from profiles where id='a8500000-0000-4000-8000-000000000002'),'[]'::jsonb,'Owner cannot change another account sound preferences');
select * from finish();
rollback;
