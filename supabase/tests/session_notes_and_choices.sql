begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(23);
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values
('a8740000-0000-4000-8000-000000000001','notes-a@example.test','{"provider":"email"}','{"username":"notes_a"}'),
('a8740000-0000-4000-8000-000000000002','notes-b@example.test','{"provider":"email"}','{"username":"notes_b"}');
select ok((select relrowsecurity from pg_class where oid='public.session_notes'::regclass),'Notes have RLS');
select ok(not has_table_privilege('authenticated','public.session_notes','INSERT,UPDATE,DELETE'),'Notes and timestamps cannot be written directly');
select ok(not has_function_privilege('anon','public.add_session_note(uuid,text,uuid)','EXECUTE'),'Anonymous callers cannot append notes');
update profiles set display_name='A reader',timezone='Europe/Berlin',reduce_motion=true,selected_theme='night-shift',
  companion_preferences='{"mode":"characters","characterSlugs":["male-01"]}',webcam_enabled=true,
  music_track=null,music_volume=0.7,background_effects='["rain"]',room_volume=0.5 where id='a8740000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a8740000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('test.note_session',(public.start_study_session(null,'night-shift',null,'{"mode":"characters","characterSlugs":["male-01"]}')).id::text,true);
select set_config('test.note_id',(public.add_session_note(current_setting('test.note_session')::uuid,'  Remember chapter three  ','00000000-0000-4000-8000-000000000001')->>'id'),true);
select is(public.read_session_notes(current_setting('test.note_session')::uuid)->'items'->0->>'body','Remember chapter three','Owner reads the trimmed note');
select is(public.add_session_note(current_setting('test.note_session')::uuid,'Remember chapter three','00000000-0000-4000-8000-000000000001')->>'id',current_setting('test.note_id'),'Network retry is idempotent');
select is((select count(*) from session_notes),1::bigint,'Retry does not duplicate a note');
select throws_ok(format('select public.add_session_note(%L::uuid,%L,%L::uuid)',current_setting('test.note_session'),'Different text','00000000-0000-4000-8000-000000000001'),'22023',null,'Changed retry is rejected');
select throws_ok(format('select public.add_session_note(%L::uuid,%L,%L::uuid)',current_setting('test.note_session'),' ','00000000-0000-4000-8000-000000000002'),'22023',null,'Empty note is rejected');
select throws_ok(format('select public.add_session_note(%L::uuid,%L,%L::uuid)',current_setting('test.note_session'),repeat('a',2001),'00000000-0000-4000-8000-000000000002'),'22023',null,'Oversized note is rejected');
select set_config('request.jwt.claims','{"sub":"a8740000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from session_notes),0::bigint,'Another account cannot select private notes');
select throws_ok(format('select public.read_session_notes(%L::uuid)',current_setting('test.note_session')),'42501',null,'Another account cannot read the session notebook');
select throws_ok(format('select public.add_session_note(%L::uuid,%L,%L::uuid)',current_setting('test.note_session'),'Intrusion','00000000-0000-4000-8000-000000000003'),'42501',null,'Another account cannot append notes');
select set_config('request.jwt.claims','{"sub":"a8740000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.finish_study_session(current_setting('test.note_session')::uuid,'stopped_early');
select throws_ok(format('select public.add_session_note(%L::uuid,%L,%L::uuid)',current_setting('test.note_session'),'After Finish','00000000-0000-4000-8000-000000000004'),'42501',null,'Finished sessions cannot receive new notes');
select is(public.read_session_notes(current_setting('test.note_session')::uuid)->'items'->0->>'body','Remember chapter three','Saved notes remain private session history');
select is((select companion_preferences from profiles where id=auth.uid()),'{"mode":"solo","characterSlugs":[]}'::jsonb,'Finish clears companion preferences');
select is((select selected_theme from profiles where id=auth.uid()),'night-shift','Finish preserves an intentional theme Setting');
select ok((select webcam_enabled and background_effects='["rain"]'::jsonb and music_volume=0.7 and room_volume=0.5 from profiles where id=auth.uid()),'Finish preserves intentional camera and sound Settings');
select ok((select display_name='A reader' and timezone='Europe/Berlin' and reduce_motion from profiles where id=auth.uid()),'Account and accessibility preferences survive cleanup');
select throws_ok($$update profiles set companion_preferences='{"mode":"characters","characterSlugs":["medieval-scholar"]}' where id=auth.uid()$$,'22023',null,'Retired partners cannot be saved as new choices');
select throws_ok($$select public.start_study_session(null,'rain-desk',null,'{"mode":"characters","characterSlugs":["medieval-scribe"]}')$$,'22023',null,'Retired partners cannot start a new session');
reset role;
insert into session_notes(session_id,user_id,client_id,body,created_at)
select current_setting('test.note_session')::uuid,'a8740000-0000-4000-8000-000000000001',gen_random_uuid(),'Earlier note '||n,'2026-10-01T12:00:00Z' from generate_series(1,51) n;
set local role authenticated;
select set_config('test.note_page',public.read_session_notes(current_setting('test.note_session')::uuid)::text,true);
select is(jsonb_array_length(current_setting('test.note_page')::jsonb->'items'),50,'Newest notes have a bounded first page');
select set_config('test.note_page2',public.read_session_notes(current_setting('test.note_session')::uuid,(current_setting('test.note_page')::jsonb->'nextCursor'->>'at')::timestamptz,(current_setting('test.note_page')::jsonb->'nextCursor'->>'id')::uuid)::text,true);
select is(jsonb_array_length(current_setting('test.note_page2')::jsonb->'items'),2,'Keyset cursor retains tied-timestamp notes');
select is((select count(distinct item->>'id') from jsonb_array_elements((current_setting('test.note_page')::jsonb->'items')||(current_setting('test.note_page2')::jsonb->'items')) item),52::bigint,'Pagination neither repeats nor loses notes');
select * from finish();
rollback;
