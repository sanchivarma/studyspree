-- A vanished session closes after ten minutes without a heartbeat. Credit
-- through its last trusted heartbeat, capped by the existing ninety-minute trigger.
create or replace function public.maintain_study_leases() returns jsonb language plpgsql security definer set search_path='' as $$
declare stale record;day_record record;stored bigint;closed integer:=0;rooms integer:=0;freezes integer:=0;reconciled integer:=0;warnings integer:=0;errors jsonb:='[]';
begin
 begin
  for stale in select id,last_heartbeat_at from public.sessions where ended_at is null and last_heartbeat_at<now()-interval '10 minutes' for update skip locked loop
   update public.sessions set ended_at=last_heartbeat_at,ended_reason='abandoned' where id=stale.id;closed:=closed+1;
  end loop;
 exception when others then errors:=errors||'"sessions"'::jsonb;closed:=0;
 end;
 begin
  update public.room_visits v set left_at=greatest(v.joined_at,v.last_seen_at),sharing_video=false where v.left_at is null and(v.last_seen_at<now()-interval '90 seconds' or exists(select 1 from public.study_rooms r where r.id=v.room_id and r.is_closed) or (auth_private.room_usage(v.user_id)->>'remainingSeconds')::bigint<=0);
  get diagnostics rooms=row_count;
 exception when others then errors:=errors||'"rooms"'::jsonb;
 end;
 begin
  update public.streaks s set freezes_remaining=2,freezes_reset_at=(date_trunc('month',now() at time zone p.timezone)+interval '1 month')::date from public.profiles p where p.id=s.user_id and(now() at time zone p.timezone)::date>=s.freezes_reset_at;
  get diagnostics freezes=row_count;
 exception when others then errors:=errors||'"freezes"'::jsonb;
 end;
 begin
  for day_record in select user_id,local_date,sum(actual_seconds)::bigint seconds,count(*)::integer sessions from public.sessions where ended_at is not null and user_id in(select user_id from public.sessions where coalesce(ended_at,started_at)>now()-interval '48 hours') group by user_id,local_date loop
   select total_seconds into stored from public.day_stats where user_id=day_record.user_id and local_date=day_record.local_date;
   if stored>day_record.seconds then
    warnings:=warnings+1;raise warning 'Reconciliation retained a larger banked total';
   else
    insert into public.day_stats(user_id,local_date,total_seconds,session_count) values(day_record.user_id,day_record.local_date,day_record.seconds,day_record.sessions)
    on conflict(user_id,local_date) do update set total_seconds=greatest(public.day_stats.total_seconds,excluded.total_seconds),session_count=greatest(public.day_stats.session_count,excluded.session_count);
    reconciled:=reconciled+1;
   end if;
  end loop;
 exception when others then errors:=errors||'"reconciliation"'::jsonb;reconciled:=0;
 end;
 return jsonb_build_object('visits',coalesce((select jsonb_agg(jsonb_build_object('roomId',room_id,'userId',user_id,'sharing',sharing_video)) from public.room_visits where left_at is null),'[]'),
 'counts',jsonb_build_object('closedSessions',closed,'closedRooms',rooms,'resetFreezes',freezes,'reconciledDays',reconciled,'retainedLargerTotals',warnings),'errors',errors);
end;$$;
