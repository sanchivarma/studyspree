-- HTTP, saved-message reads and Realtime all use this same authorization predicate.
create or replace function auth_private.can_read_thread(t uuid,actor uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select actor is not null and exists(
  select 1 from public.conversation_threads c where c.id=t
  and ((c.kind='channel' and c.group_id is null)
    or(c.group_id is not null and auth_private.group_member(c.group_id,actor))
    or exists(select 1 from public.thread_members where thread_id=t and user_id=actor))
  and ((c.kind<>'group' and c.group_id is null) or not exists(
    select 1 from public.feature_entitlements e where e.user_id=actor and e.feature_key='group-chat'
      and(not e.enabled or e.valid_until<=now())
  ))
 );
$$;
revoke all on function auth_private.can_read_thread(uuid,uuid) from public,anon;
grant execute on function auth_private.can_read_thread(uuid,uuid) to authenticated;
