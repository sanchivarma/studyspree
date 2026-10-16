create function public.community_leaderboard(p_metric text,p_period text,p_cursor jsonb default null) returns jsonb language plpgsql security definer set search_path='' as $$
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
    select p.id,case when p_metric='streak' then coalesce((select best_streak from public.streaks where user_id=p.id),0)::bigint
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
  'context',jsonb_build_object('snapshotAt',stamp,'optedIn',(select leaderboard_opt_in from public.profiles where id=actor)),
  'nextCursor',case when jsonb_array_length(items)=20 then jsonb_build_object('snapshotAt',stamp,'offset',page_offset+20)::text else null end);
end;$$;
revoke all on function public.community_leaderboard(text,text,jsonb) from public,anon;
grant execute on function public.community_leaderboard(text,text,jsonb) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('community-media','community-media',false,10485760,array['image/jpeg','image/png','image/webp','image/gif','audio/mpeg','audio/webm','audio/ogg','application/pdf']);
create function auth_private.can_read_attachment(object_name text,actor uuid) returns boolean language sql stable security definer set search_path='' as $$
select (split_part(object_name,'/',1)=actor::text) or exists(select 1 from public.feed_posts p where auth_private.can_read_post(p.id,actor) and exists(select 1 from jsonb_array_elements(p.attachments) a where a->>'path'=object_name));$$;
create policy community_media_insert on storage.objects for insert to authenticated with check(bucket_id='community-media' and (storage.foldername(name))[1]=(select auth.uid())::text and name~'^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp|gif|mp3|webm|ogg|pdf)$');
create policy community_media_read on storage.objects for select to authenticated using(bucket_id='community-media' and auth_private.can_read_attachment(name,(select auth.uid())));
create policy community_media_delete on storage.objects for delete to authenticated using(bucket_id='community-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
revoke all on function auth_private.can_read_attachment(text,uuid) from public,anon;
grant execute on function auth_private.can_read_attachment(text,uuid) to authenticated;
create function auth_private.validate_post_attachments() returns trigger language plpgsql security definer set search_path='' as $$
declare attachment jsonb;
begin
 for attachment in select value from jsonb_array_elements(new.attachments) loop
  if jsonb_typeof(attachment)<>'object' or length(attachment->>'name') not between 1 and 100
   or split_part(attachment->>'path','/',1)<>new.author_id::text
   or not exists(select 1 from storage.objects where bucket_id='community-media' and name=attachment->>'path' and metadata->>'mimetype'=attachment->>'mime') then
   raise exception 'Invalid attachment' using errcode='23514';
  end if;
 end loop;
 return new;
end;$$;
create trigger validate_post_attachments before insert or update of attachments on public.feed_posts for each row execute function auth_private.validate_post_attachments();
revoke all on function auth_private.validate_post_attachments() from public,anon,authenticated;
