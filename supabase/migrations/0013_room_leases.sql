-- Blocked accounts cannot share a room, even by calling RPC directly.
create function auth_private.protect_room_presence() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.room_visits v where v.room_id=new.room_id and v.left_at is null and v.last_seen_at>now()-interval '90 seconds' and auth_private.is_blocked(v.user_id,new.user_id)) then raise exception 'Room unavailable' using errcode='42501';end if;
 return new;
end;$$;
create trigger protect_room_presence before insert on public.room_visits for each row execute function auth_private.protect_room_presence();
create function auth_private.close_blocked_presence() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.room_visits set left_at=now(),sharing_video=false where user_id=new.blocker_id and left_at is null and room_id in(select room_id from public.room_visits where user_id=new.blocked_id and left_at is null);return new;
end;$$;
create trigger close_blocked_presence after insert on public.user_blocks for each row execute function auth_private.close_blocked_presence();
create function auth_private.close_finished_room() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.ended_at is null and new.ended_at is not null then update public.room_visits set left_at=now(),sharing_video=false where user_id=new.user_id and left_at is null;end if;return new;
end;$$;
create trigger close_finished_room after update on public.sessions for each row execute function auth_private.close_finished_room();

-- Called by the protected application cron endpoint; never a browser RPC.
create function public.maintain_study_leases() returns jsonb language plpgsql security definer set search_path='' as $$
declare stale record;
begin
 for stale in select id from public.sessions where ended_at is null and last_heartbeat_at<now()-interval '90 minutes' for update skip locked loop
  update public.sessions set ended_at=least(now(),started_at+interval '90 minutes'),ended_reason='abandoned' where id=stale.id;
 end loop;
 update public.room_visits v set left_at=greatest(v.joined_at,v.last_seen_at),sharing_video=false where v.left_at is null and(v.last_seen_at<now()-interval '90 seconds' or exists(select 1 from public.study_rooms r where r.id=v.room_id and r.is_closed) or (auth_private.room_usage(v.user_id)->>'remainingSeconds')::bigint<=0);
 update public.streaks s set freezes_remaining=2,freezes_reset_at=(date_trunc('month',now() at time zone p.timezone)+interval '1 month')::date from public.profiles p where p.id=s.user_id and (now() at time zone p.timezone)::date>=s.freezes_reset_at;
 return coalesce((select jsonb_agg(jsonb_build_object('roomId',room_id,'userId',user_id,'sharing',sharing_video)) from public.room_visits where left_at is null),'[]');
end;$$;
revoke all on function public.maintain_study_leases() from public,anon,authenticated;
grant execute on function public.maintain_study_leases() to service_role;
revoke all on function auth_private.protect_room_presence(),auth_private.close_blocked_presence(),auth_private.close_finished_room() from public,anon,authenticated;
