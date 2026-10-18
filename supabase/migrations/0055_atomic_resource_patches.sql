-- Preserve omitted fields under an owner-row lock, including concurrent edits.
create function public.community_patch(p_resource text,p_id uuid,p_patch jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();base jsonb;merged jsonb;allowed text[];action text;result jsonb;
begin
 if actor is null then raise exception 'Not authorized' using errcode='42501';end if;
 if jsonb_typeof(p_patch)<>'object' or p_patch='{}'::jsonb then raise exception 'Invalid patch' using errcode='22023';end if;
 case p_resource
 when 'tasks' then
  allowed:=array['title','date','position','done'];action:='task.edit';
  select jsonb_build_object('title',title,'date',due_date,'position',position,'done',is_done) into base from public.study_tasks where id=p_id and user_id=actor for update;
 when 'groups' then
  allowed:=array['title','body'];action:='group.update';
  select jsonb_build_object('title',name,'body',description) into base from public.study_groups where id=p_id and owner_id=actor for update;
 when 'rooms','spaces' then
  allowed:=array['title','body','capacity'];action:='room.update';
  select jsonb_build_object('title',name,'body',description,'capacity',capacity) into base from public.study_rooms where id=p_id and owner_id=actor for update;
 when 'buddy-listings' then
  allowed:=array['title','body','subjects','category','timezone','availability','published'];action:='buddy.save';
  select jsonb_build_object('title',title,'body',body,'subjects',subjects,'category',category,'timezone',timezone,'availability',availability,'published',is_published) into base from public.buddy_listings where id=p_id and owner_id=actor for update;
 when 'scheduled-sessions' then
  allowed:=array['title','startsAt','endsAt','minutes','capacity','mode','timezone','characterSlugs'];action:='event.update';
  select jsonb_build_object('title',title,'startsAt',starts_at,'minutes',minutes,'capacity',capacity,'mode',mode,'timezone',scheduling_timezone,'characterSlugs',character_slugs) into base from public.scheduled_sessions where id=p_id and creator_id=actor for update;
 else raise exception 'Invalid resource' using errcode='22023';
 end case;
 if base is null then raise exception 'Not authorized' using errcode='42501';end if;
 if exists(select 1 from jsonb_each(p_patch) where not(key=any(allowed)) or value='null'::jsonb) then raise exception 'Invalid fields' using errcode='22023';end if;
 merged:=base||p_patch||jsonb_build_object('id',p_id);
 if jsonb_typeof(merged->'title')<>'string' or length(btrim(merged->>'title')) not between 1 and (case when p_resource='tasks' then 300 else 100 end) then raise exception 'Invalid title' using errcode='22023';end if;
 if p_resource='scheduled-sessions' and p_patch?'endsAt' then
  if p_patch?'minutes' and (p_patch->>'minutes')::numeric<>extract(epoch from((p_patch->>'endsAt')::timestamptz-(merged->>'startsAt')::timestamptz))/60 then raise exception 'Conflicting duration' using errcode='22023';end if;
  merged:=(merged-'endsAt')||jsonb_build_object('minutes',extract(epoch from((p_patch->>'endsAt')::timestamptz-(merged->>'startsAt')::timestamptz))/60);
  if (merged->>'minutes')::numeric not in(30,60) then raise exception 'Invalid duration' using errcode='22023';end if;
 end if;
 result:=public.community_mutate(action,merged);
 if p_resource='tasks' and p_patch?'done' then
  if jsonb_typeof(p_patch->'done')<>'boolean' then raise exception 'Invalid completion' using errcode='22023';end if;
  perform public.community_mutate('task.update',jsonb_build_object('id',p_id,'done',p_patch->'done'));
 end if;
 return result;
end;$$;
revoke all on function public.community_patch(text,uuid,jsonb) from public,anon;
grant execute on function public.community_patch(text,uuid,jsonb) to authenticated;
