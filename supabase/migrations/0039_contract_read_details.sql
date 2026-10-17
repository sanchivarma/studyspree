-- Public badges stay inside the existing explicit profile projection.
alter function public.read_visible_profile(text) rename to read_visible_profile_v38;
revoke all on function public.read_visible_profile_v38(text) from public,anon,authenticated;
create function public.read_visible_profile(p_username text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;badge text;
begin
 result:=public.read_visible_profile_v38(p_username);
 if result is null then return null;end if;
 select a.achievement_id into badge from public.user_achievements a join public.achievement_definitions d on d.id=a.achievement_id
 where a.user_id=(result->>'id')::uuid order by case d.kind when 'streak' then 0 when 'study-seconds' then 1 else 2 end,d.threshold desc,d.id limit 1;
 return result||jsonb_build_object('highestBadgeId',badge);
end;$$;
create function public.read_visible_profile_by_id(p_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select public.read_visible_profile(username) from public.profiles where id=p_id and auth.uid() is not null;
$$;
revoke all on function public.read_visible_profile(text),public.read_visible_profile_by_id(uuid) from public,anon;
grant execute on function public.read_visible_profile(text),public.read_visible_profile_by_id(uuid) to authenticated;

-- Keyset pages can also target one scheduled resource without changing its visibility.
do $$declare definition text;begin
 definition:=pg_get_functiondef('public.community_read_base(text,jsonb)'::regprocedure);
 execute replace(definition,'where (e.creator_id=actor or(e.mode=', 'where (resource is null or e.id=resource) and (e.creator_id=actor or(e.mode=');
end;$$;

alter function public.community_mutate(text,jsonb) rename to community_mutate_v38;
revoke all on function public.community_mutate_v38(text,jsonb) from public,anon,authenticated;
create function public.community_mutate(p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Not authorized' using errcode='42501';end if;
 if p_action in('buddy.save','buddy.remove') and p_data->>'id' is not null and not exists(select 1 from public.buddy_listings where id=(p_data->>'id')::uuid and owner_id=auth.uid()) then raise exception 'Not authorized' using errcode='42501';end if;
 if p_action='partner.favourite' then return public.community_mutate_v38('partner.set',jsonb_build_object('targetId',p_data->>'targetId','favorite',(p_data->>'value')::boolean,'notify',coalesce((select notify from public.partner_preferences where user_id=auth.uid() and partner_id=(p_data->>'targetId')::uuid),false)));end if;
 return public.community_mutate_v38(p_action,p_data);
end;$$;
revoke all on function public.community_mutate(text,jsonb) from public,anon;
grant execute on function public.community_mutate(text,jsonb) to authenticated;
