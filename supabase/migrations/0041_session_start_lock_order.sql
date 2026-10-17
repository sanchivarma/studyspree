-- All room-associated starts acquire actor-presence before actor-session locks.
do $$declare definition text;begin
 definition:=pg_get_functiondef('public.start_session_with_details(integer,text,text,jsonb,text,text,text,uuid)'::regprocedure);
 execute replace(definition,'perform pg_advisory_xact_lock(hashtextextended(actor::text,0));','perform pg_advisory_xact_lock(hashtextextended(actor::text,1)); perform pg_advisory_xact_lock(hashtextextended(actor::text,0));');
end;$$;
