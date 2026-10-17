-- Plan policies remain separate from explicit per-feature grants.
create table public.feature_entitlements (
 user_id uuid references public.profiles(id) on delete cascade,
 feature_key text check(feature_key in('shared-room-access','detailed-history','group-chat','extended-partner-history')),
 enabled boolean not null,valid_until timestamptz,primary key(user_id,feature_key)
);
create table public.usage_events (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,
 idempotency_key text not null unique,resource text not null,created_at timestamptz not null default now()
);
create table public.billing_events (
 provider text not null,event_id text not null,payload_hash text not null,processed_at timestamptz not null default now(),primary key(provider,event_id)
);
alter table public.feature_entitlements enable row level security;
alter table public.usage_events enable row level security;
alter table public.billing_events enable row level security;
revoke all on public.feature_entitlements,public.usage_events,public.billing_events from public,anon,authenticated;
grant select on public.feature_entitlements,public.usage_events to authenticated;
create policy own_features on public.feature_entitlements for select to authenticated using(user_id=auth.uid());
create policy own_usage_events on public.usage_events for select to authenticated using(user_id=auth.uid());
-- The original visits are already trusted, RLS-protected connection intervals.
create view public.usage_intervals with(security_invoker=true) as select id,user_id,'shared-room-access'::text resource,joined_at started_at,left_at ended_at from public.room_visits where user_id=auth.uid();
grant select on public.usage_intervals to authenticated;
create function auth_private.require_feature(actor uuid,feature text) returns void language plpgsql stable security definer set search_path='' as $$
begin
 if actor is null or exists(select 1 from public.feature_entitlements where user_id=actor and feature_key=feature and(not enabled or valid_until<=now())) then raise exception 'Feature unavailable' using errcode='42501';end if;
end;$$;
create function public.read_entitlements() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid();usage jsonb;result jsonb;
begin
 if actor is null then raise exception 'Not authorized' using errcode='42501';end if;
 usage:=auth_private.room_usage(actor);
 select jsonb_agg(jsonb_build_object('key',k,'enabled',coalesce(e.enabled and(e.valid_until is null or e.valid_until>now()),true) and not(coalesce(e.user_id is not null and e.valid_until<=now(),false)),
 'remainingSeconds',case when k='shared-room-access' then usage->'remainingSeconds' else null end,'resetsAt',case when k='shared-room-access' then usage->'resetsAt' else null end)) into result
 from unnest(array['shared-room-access','detailed-history','group-chat','extended-partner-history']) k left join public.feature_entitlements e on e.user_id=actor and e.feature_key=k;
 return result;
end;$$;
create function public.apply_billing_event(p_provider text,p_event text,p_hash text,p_user uuid,p_feature text,p_enabled boolean,p_valid_until timestamptz) returns boolean language plpgsql security definer set search_path='' as $$
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
alter function public.community_mutate(text,jsonb) rename to community_mutate_v35;
revoke all on function public.community_mutate_v35(text,jsonb) from public,anon,authenticated;
create function public.community_mutate(p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;visit uuid;actor uuid:=auth.uid();
begin
 if p_action in('room.join','event.start') or(p_action='room.share' and(p_data->>'value')::boolean) then
  if p_action<>'event.start' or exists(select 1 from public.scheduled_sessions where id=(p_data->>'id')::uuid and mode='people') then perform auth_private.require_feature(actor,'shared-room-access');end if;
 end if;
 if p_action='thread.create' then perform auth_private.require_feature(actor,'group-chat');end if;
 result:=public.community_mutate_v35(p_action,p_data);
 if p_action='room.join' then
  select id into visit from public.room_visits where room_id=(p_data->>'id')::uuid and user_id=actor and left_at is null;
  if visit is not null then insert into public.usage_events(user_id,idempotency_key,resource) values(actor,'room:'||visit,'shared-room-access') on conflict do nothing;end if;
 end if;
 return result;
end;$$;
revoke all on function auth_private.require_feature(uuid,text) from public,anon;
grant execute on function auth_private.require_feature(uuid,text) to authenticated;
revoke all on function public.read_entitlements(),public.apply_billing_event(text,text,text,uuid,text,boolean,timestamptz),public.community_mutate(text,jsonb) from public,anon;
grant execute on function public.read_entitlements(),public.apply_billing_event(text,text,text,uuid,text,boolean,timestamptz),public.community_mutate(text,jsonb) to authenticated;
