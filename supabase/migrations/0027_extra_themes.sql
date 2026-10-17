-- Add theme choices without changing saved historical selections or accounting.
do $$ declare rule record; begin
 for rule in select conrelid::regclass as table_name, conname from pg_constraint where contype='c' and conrelid in ('public.profiles'::regclass,'public.sessions'::regclass) and (pg_get_constraintdef(oid) like '%selected_theme%' or pg_get_constraintdef(oid) like '%theme_slug%') loop
  execute format('alter table %s drop constraint %I',rule.table_name,rule.conname);
 end loop;
end $$;
alter table public.profiles add constraint profiles_theme_choices check(selected_theme in ('rain-desk','night-shift','balcony-dusk','dorm-bunk','nature-day','nature-night','sci-fi','space'));
alter table public.sessions add constraint sessions_theme_choices check(theme_slug in ('rain-desk','night-shift','balcony-dusk','dorm-bunk','nature-day','nature-night','sci-fi','space'));
create or replace function public.start_study_session(p_minutes integer,p_theme text,p_task text,p_companions jsonb)
returns public.sessions language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result public.sessions;
begin
  if actor is null then raise exception 'Not authorized' using errcode='42501'; end if;
  if p_minutes is not null and p_minutes not in (5,15,25,50) then raise exception 'Invalid minutes' using errcode='22023'; end if;
  if p_theme not in ('rain-desk','night-shift','balcony-dusk','dorm-bunk','nature-day','nature-night','sci-fi','space') or length(p_task)>500 or not public.valid_companion_selection(p_companions) then raise exception 'Invalid input' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
  select * into result from public.sessions where user_id=actor and ended_at is null for update;
  if found then return result; end if;
  if (select count(*) from public.sessions where user_id=actor and started_at>clock_timestamp()-interval '1 hour')>=30 then raise exception 'Start rate limit'; end if;
  insert into public.sessions(user_id,planned_minutes,theme_slug,task,companions)
  values(actor,p_minutes,p_theme,nullif(trim(p_task),''),p_companions) returning * into result;
  return result;
end;
$$;
