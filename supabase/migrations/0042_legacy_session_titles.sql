-- Preserve old clients' task-derived sharing titles while new setup uses its explicit title.
alter table public.sessions add column title_explicit boolean not null default false;
do $$declare definition text;begin
 definition:=pg_get_functiondef('public.start_session_with_details(integer,text,text,jsonb,text,text,text,uuid)'::regprocedure);
 execute replace(definition,'set title=btrim(p_title),rules=', 'set title=btrim(p_title),title_explicit=true,rules=');
 definition:=pg_get_functiondef('public.calendar_mutate(text,jsonb)'::regprocedure);
 execute replace(definition,'set name=s.title,source_session_id=', 'set name=case when s.title_explicit then s.title else left(coalesce(nullif(s.task,''''),s.title),100) end,source_session_id=');
end;$$;
