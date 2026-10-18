-- Page limits and keyset cursors over trusted five-minute ranking snapshots.
-- Time/week retains seven saved profile-local calendar dates, including today;
-- it is not an elapsed 168-hour window. Historical session dates stay saved.
create function public.community_leaderboard_page(p_metric text,p_period text,p_limit integer,p_cursor jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();base jsonb;stamp timestamptz;last_rank integer:=0;items jsonb;has_more boolean;
begin
 if actor is null then raise exception 'Not authorized' using errcode='42501';end if;
 if p_metric is null or p_period is null or p_limit is null or p_metric not in('time','streak') or p_period not in('week','all') or p_limit not between 1 and 100 then raise exception 'Invalid ranking' using errcode='22023';end if;
 if p_cursor is null then
  base:=public.community_leaderboard(p_metric,p_period,null);
  stamp:=(base->'context'->>'snapshotAt')::timestamptz;
 else
  if jsonb_typeof(p_cursor)<>'object' or p_cursor->>'metric' is distinct from p_metric or p_cursor->>'period' is distinct from p_period
   or jsonb_typeof(p_cursor->'afterRank')<>'number' then raise exception 'Invalid cursor' using errcode='22023';end if;
  stamp:=(p_cursor->>'snapshotAt')::timestamptz;last_rank:=(p_cursor->>'afterRank')::integer;
  if stamp is null or stamp<now()-interval '1 day' or stamp>now() or last_rank<0 then raise exception 'Refresh rankings' using errcode='22023';end if;
 end if;
 select coalesce(jsonb_agg(item order by rank),'[]'),count(*)>p_limit into items,has_more from (
  select s.rank,auth_private.community_item(s.user_id,coalesce(auth_private.person(s.user_id)->>'displayName',''),'',stamp,s.user_id,jsonb_build_object('rank',s.rank,'score',s.score)) item
  from public.leaderboard_snapshots s where s.snapshot_at=stamp and s.metric=p_metric and s.period=p_period and s.rank>last_rank
  and auth_private.leaderboard_consent(s.user_id) and not auth_private.is_blocked(actor,s.user_id)
  order by s.rank,s.user_id limit p_limit+1
 ) ranked;
 if has_more then items:=items-(jsonb_array_length(items)-1);end if;
 return jsonb_build_object('items',items,'resource',null,'viewerId',actor,'available',true,
  'context',jsonb_build_object('snapshotAt',stamp,'computedAt',stamp,'window',case when p_period='all' then 'all-time' else 'seven-profile-local-dates' end,'optedIn',(select leaderboard_opt_in from public.profiles where id=actor)),
  'nextCursor',case when has_more then jsonb_build_object('snapshotAt',stamp,'afterRank',(items->-1->'data'->>'rank')::integer,'metric',p_metric,'period',p_period)::text else null end);
end;$$;
revoke all on function public.community_leaderboard_page(text,text,integer,jsonb) from public,anon;
grant execute on function public.community_leaderboard_page(text,text,integer,jsonb) to authenticated;
