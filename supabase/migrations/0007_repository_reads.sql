create function public.study_summary() returns jsonb language sql stable security definer set search_path='' as $$
select jsonb_build_object('totalSeconds',coalesce((select sum(total_seconds) from public.day_stats where user_id=auth.uid()),0),
  'sessionCount',coalesce((select sum(session_count) from public.day_stats where user_id=auth.uid()),0),
  'firstSessionDate',(select min(local_date) from public.sessions where user_id=auth.uid() and ended_at is not null)) where auth.uid() is not null;
$$;
create function public.study_days(p_from date,p_to date) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Not authorized' using errcode='42501'; end if;
  if p_to<p_from or p_to-p_from>36600 then raise exception 'Invalid range' using errcode='22023'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('date',local_date,'totalSeconds',total_seconds,'sessionCount',session_count) order by local_date)
    from public.day_stats where user_id=auth.uid() and local_date between p_from and p_to),'[]'::jsonb);
end;
$$;
revoke all on function public.study_summary(),public.study_days(date,date) from public,anon;
grant execute on function public.study_summary(),public.study_days(date,date) to authenticated;
