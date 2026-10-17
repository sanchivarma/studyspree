create or replace function public.apply_billing_event(p_provider text,p_event text,p_hash text,p_user uuid,p_feature text,p_enabled boolean,p_valid_until timestamptz default null) returns boolean language plpgsql security definer set search_path='' as $$
declare previous text;
begin
 if not auth_private.community_admin(auth.uid()) then raise exception 'Not authorized' using errcode='42501';end if;
 if length(p_event) not between 1 and 200 or p_provider<>'custom-hmac' or p_hash!~'^[a-f0-9]{64}$' then raise exception 'Invalid event' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_provider||p_event,36));
 select payload_hash into previous from public.billing_events where provider=p_provider and event_id=p_event;
 if found then if previous<>p_hash then raise exception 'Event collision' using errcode='22023';end if;return false;end if;
 insert into public.feature_entitlements(user_id,feature_key,enabled,valid_until) values(p_user,p_feature,p_enabled,p_valid_until)
 on conflict(user_id,feature_key) do update set enabled=excluded.enabled,valid_until=excluded.valid_until;
 insert into public.billing_events(provider,event_id,payload_hash) values(p_provider,p_event,p_hash);
 return true;
end;$$;

-- Existing connections also lose allowance on feature expiry; Finish and personal hours stay available.
alter function auth_private.room_usage(uuid) rename to room_usage_v36;
revoke all on function auth_private.room_usage_v36(uuid) from public,anon,authenticated;
create function auth_private.room_usage(actor uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 result:=auth_private.room_usage_v36(actor);
 if exists(select 1 from public.feature_entitlements where user_id=actor and feature_key='shared-room-access' and(not enabled or valid_until<=now())) then
 result:=result||jsonb_build_object('remainingSeconds',0);
 end if;
 return result;
end;$$;
revoke all on function auth_private.room_usage(uuid) from public,anon,authenticated;
