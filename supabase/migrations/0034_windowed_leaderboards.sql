-- Windowed ranking reuses the canonical streak transition; personal bests are never altered.
create function auth_private.streak_in_window(actor uuid,from_day date,to_day date) returns bigint language plpgsql stable security definer set search_path='' as $$
declare state jsonb:=jsonb_build_object('current',0,'best',0,'lastActiveDate',null,'freezesRemaining',2,'freezesResetAt',(date_trunc('month',from_day)+interval '1 month')::date);day date;activity jsonb;
begin
 for day in select distinct local_date from public.sessions where user_id=actor and ended_at is not null and ended_reason in('completed','stopped_early') and local_date between from_day and to_day order by local_date loop
 activity:=public.apply_streak_activity(state,day);state:=activity->'state';
 end loop;
 return (state->>'best')::bigint;
end;$$;
revoke all on function auth_private.streak_in_window(uuid,date,date) from public,anon,authenticated;
create or replace function public.community_leaderboard(p_metric text,p_period text,p_cursor jsonb default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); stamp timestamptz; page_offset integer:=0; items jsonb;
begin
 if actor is null then raise exception 'Not authorized' using errcode='42501';end if;
 if p_metric not in ('time','streak') or p_period not in ('week','all') then raise exception 'Invalid ranking' using errcode='22023';end if;
 if p_cursor is null then
  stamp:=to_timestamp(floor(extract(epoch from now())/300)*300);
  perform pg_advisory_xact_lock(hashtextextended(stamp::text||p_metric||p_period,3));
  if not exists(select 1 from public.leaderboard_snapshots where snapshot_at=stamp and metric=p_metric and period=p_period) then
   insert into public.leaderboard_snapshots(snapshot_at,metric,period,user_id,score,rank)
   select stamp,p_metric,p_period,id,score,row_number() over(order by score desc,id)::integer from(
    select p.id,case when p_metric='streak' then case when p_period='week' then auth_private.streak_in_window(p.id,(now() at time zone p.timezone)::date-6,(now() at time zone p.timezone)::date) else coalesce((select best_streak from public.streaks where user_id=p.id),0)::bigint end
     else coalesce((select sum(total_seconds) from public.day_stats where user_id=p.id and(p_period='all' or local_date between (now() at time zone p.timezone)::date-6 and(now() at time zone p.timezone)::date)),0)::bigint end score
    from public.profiles p where p.leaderboard_opt_in
   ) entries on conflict do nothing;
   delete from public.leaderboard_snapshots where snapshot_at<now()-interval '1 day';
  end if;
 else stamp:=(p_cursor->>'snapshotAt')::timestamptz;page_offset:=(p_cursor->>'offset')::integer;
  if stamp<now()-interval '1 day' or stamp>now() or page_offset not between 0 and 100000 then raise exception 'Refresh rankings' using errcode='22023';end if;
 end if;
 select coalesce(jsonb_agg(item),'[]') into items from(select auth_private.community_item(s.user_id,coalesce(auth_private.person(s.user_id)->>'displayName',''),'',stamp,s.user_id,jsonb_build_object('rank',s.rank,'score',s.score)) item from public.leaderboard_snapshots s
  where s.snapshot_at=stamp and s.metric=p_metric and s.period=p_period and auth_private.leaderboard_consent(s.user_id) and not auth_private.is_blocked(actor,s.user_id)
  order by s.rank,s.user_id limit 20 offset page_offset) entries;
 return jsonb_build_object('items',items,'resource',null,'viewerId',actor,'available',true,
  'context',jsonb_build_object('snapshotAt',stamp,'computedAt',stamp,'window','seven-profile-local-dates','optedIn',(select leaderboard_opt_in from public.profiles where id=actor)),
  'nextCursor',case when jsonb_array_length(items)=20 then jsonb_build_object('snapshotAt',stamp,'offset',page_offset+20)::text else null end);
end;$$;
