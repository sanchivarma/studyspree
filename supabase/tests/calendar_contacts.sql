begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values
('81000000-0000-4000-8000-000000000001','calendar-a@example.test','{"provider":"email"}','{"username":"calendar_a"}'),
('81000000-0000-4000-8000-000000000002','calendar-b@example.test','{"provider":"email"}','{"username":"calendar_b"}'),
('81000000-0000-4000-8000-000000000003','calendar-c@example.test','{"provider":"email"}','{"username":"calendar_c"}');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"81000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select lives_ok($$select public.calendar_mutate('contact.request','{"username":"calendar_b"}')$$,'Request a real contact');
select public.calendar_mutate('contact.request','{"username":"calendar_b"}');
select is((select count(*)::integer from public.study_contacts),1,'Contact retries are idempotent');
select throws_ok($$select public.calendar_mutate('contact.accept',jsonb_build_object('id',(select id from public.study_contacts)))$$,'42501','Record unavailable','Requester cannot accept own request');
select throws_ok($$select public.calendar_mutate('contact.list.create','{"title":"Readers","members":["81000000-0000-4000-8000-000000000002"]}')$$,'42501','Accepted contacts required','Lists require accepted contacts');
select set_config('request.jwt.claims','{"sub":"81000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select lives_ok($$select public.calendar_mutate('contact.accept',jsonb_build_object('id',(select id from public.study_contacts)))$$,'Recipient accepts');
select set_config('request.jwt.claims','{"sub":"81000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.calendar_mutate('contact.list.create','{"title":"Readers","members":["81000000-0000-4000-8000-000000000002"]}');
select lives_ok($$select public.calendar_mutate('calendar.create',jsonb_build_object('title','Read together','startsAt',date_trunc('minute',now())+interval '1 day','endsAt',date_trunc('minute',now())+interval '2 days','contacts','[]'::jsonb,'lists',jsonb_build_array((select id from public.contact_lists))))$$,'Schedule multi-day session inviting a contact list');
select is((select count(*)::integer from public.calendar_invitations),1,'Host sees list invitees');
select is((select minutes from public.scheduled_sessions where title='Read together'),1440,'End timestamp derives the calendar span');
select set_config('test.calendar_event',(select id::text from public.scheduled_sessions where title='Read together' and creator_id=auth.uid()),true);
select throws_ok($$select public.calendar_mutate('calendar.create',jsonb_build_object('title','Invalid','startsAt',now()+interval '2 days','endsAt',now()+interval '1 day','contacts','[]'::jsonb,'lists','[]'::jsonb))$$,'22023','Invalid calendar dates','Reversed dates rejected');
select set_config('request.jwt.claims','{"sub":"81000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select is((select count(*)::integer from public.study_contacts),0,'Unrelated account cannot read contacts');
select is((select count(*)::integer from public.contact_lists),0,'Contact lists are private');
select is((select count(*)::integer from jsonb_array_elements(public.calendar_read('calendar',jsonb_build_object('from',now(),'to',now()+interval '3 days'))->'items') item where item->>'id'=current_setting('test.calendar_event')),0,'Uninvited account cannot read private calendar');
select throws_ok($$select public.calendar_mutate('calendar.respond','{"id":"00000000-0000-4000-8000-000000000001","accept":true}')$$,'42501','Invitation unavailable','Uninvited RSVP rejected');
select set_config('request.jwt.claims','{"sub":"81000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*)::integer from jsonb_array_elements(public.calendar_read('calendar',jsonb_build_object('from',now(),'to',now()+interval '3 days'))->'items') item where item->>'id'=current_setting('test.calendar_event')),1,'Invitation appears before booking');
-- Resolve event id through the authorized calendar read, not an RLS bypass.
select lives_ok($$select public.calendar_mutate('calendar.respond',jsonb_build_object('id',current_setting('test.calendar_event'),'accept',true))$$,'Accept creates booking and room membership atomically');
select is((select count(*)::integer from public.session_bookings where user_id=auth.uid()),1,'Accepted invitation is booked');
select is((select item->'data'->>'response' from jsonb_array_elements(public.calendar_read('calendar',jsonb_build_object('from',now(),'to',now()+interval '3 days'))->'items') item where item->>'id'=current_setting('test.calendar_event')),'accepted','Calendar response persists');
select lives_ok($$select public.calendar_mutate('calendar.respond',jsonb_build_object('id',current_setting('test.calendar_event'),'accept',false))$$,'Decline removes booking');
select is((select count(*)::integer from public.session_bookings where user_id=auth.uid()),0,'Declined invite has no booking');
select set_config('request.jwt.claims','{"sub":"81000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('test.share_session',(public.start_study_session(25,'rain-desk',repeat('Read ',50),'{"mode":"characters","characterSlugs":["male-01"]}')).id::text,true);
select lives_ok($$select public.calendar_mutate('session.share',jsonb_build_object('id',current_setting('test.share_session')))$$,'Long personal task can be shared');
select is(public.calendar_mutate('session.share',jsonb_build_object('id',current_setting('test.share_session')))->>'id',(select shared_room_id::text from public.sessions where id=current_setting('test.share_session')::uuid),'Repeated sharing reuses one room');
select is((select length(name) from public.study_rooms where id=(select shared_room_id from public.sessions where id=current_setting('test.share_session')::uuid)),100,'Shared title fits the room limit');
select is((select actual_seconds from public.sessions where id=current_setting('test.share_session')::uuid),0,'Sharing never banks client time');
select set_config('request.jwt.claims','{"sub":"81000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok($$select public.calendar_mutate('session.share',jsonb_build_object('id',current_setting('test.share_session')))$$,'42501','Session unavailable','Another user cannot share a private timer');
select * from finish();
rollback;
