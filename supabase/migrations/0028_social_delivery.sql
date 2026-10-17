-- Explicit subject consent and retry-safe publication, independent of study accounting.
alter table public.profiles add column share_presence boolean not null default false;
grant update(share_presence) on public.profiles to authenticated;
alter table public.feed_posts add column client_id uuid not null default gen_random_uuid();
create unique index feed_publication_retry on public.feed_posts(author_id,client_id);

create or replace function auth_private.notify_partner_arrival() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.app_notifications(user_id,actor_id,kind,resource_id)
 select p.user_id,new.user_id,'partner',new.room_id from public.partner_preferences p
 where p.partner_id=new.user_id and p.notify
 and (select share_presence from public.profiles where id=new.user_id)
 and auth_private.can_read_room(new.room_id,p.user_id)
 and not auth_private.is_blocked(p.user_id,new.user_id)
 and not exists(select 1 from public.app_notifications where user_id=p.user_id and actor_id=new.user_id and kind='partner' and created_at>now()-interval '1 hour');
 return new;
end;$$;

alter function public.community_mutate(text,jsonb) rename to community_mutate_v27;
revoke all on function public.community_mutate_v27(text,jsonb) from public,anon,authenticated;
create function public.community_mutate(p_action text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); request_id uuid; existing public.feed_posts; result jsonb;
begin
 if actor is null then raise exception 'Not authorized' using errcode='42501';end if;
 if p_action='preferences' and p_data ? 'sharePresence' then
  if jsonb_typeof(p_data->'sharePresence')<>'boolean' then raise exception 'Invalid consent' using errcode='22023';end if;
  update public.profiles set share_presence=(p_data->>'sharePresence')::boolean where id=actor;
 end if;
 if p_action='post.create' then
  request_id:=coalesce((p_data->>'clientId')::uuid,gen_random_uuid());
  perform pg_advisory_xact_lock(hashtextextended(actor::text||request_id::text,28));
  select * into existing from public.feed_posts where author_id=actor and client_id=request_id;
  if found then
   if existing.group_id is distinct from (p_data->>'groupId')::uuid or existing.parent_id is distinct from (p_data->>'parentId')::uuid then raise exception 'Request already used' using errcode='22023';end if;
   if not auth_private.can_read_post(existing.id,actor) then raise exception 'Not authorized' using errcode='42501';end if;
   return jsonb_build_object('id',existing.id);
  end if;
  result:=public.community_mutate_v27(p_action,p_data);
  update public.feed_posts set client_id=request_id where id=(result->>'id')::uuid and author_id=actor;
  return result;
 end if;
 return public.community_mutate_v27(p_action,p_data);
end;$$;
revoke all on function public.community_mutate(text,jsonb) from public,anon;
grant execute on function public.community_mutate(text,jsonb) to authenticated;

-- The read wrapper exposes consent only to its owner.
alter function public.community_read(text,jsonb) rename to community_read_v27;
revoke all on function public.community_read_v27(text,jsonb) from public,anon,authenticated;
create function public.community_read(p_area text,p_query jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 result:=public.community_read_v27(p_area,p_query);
 if p_area='preferences' then
  result:=jsonb_set(result,'{context}',(result->'context')||jsonb_build_object('sharePresence',(select share_presence from public.profiles where id=auth.uid())));
 end if;
 return result;
end;$$;
revoke all on function public.community_read(text,jsonb) from public,anon;
grant execute on function public.community_read(text,jsonb) to authenticated;
